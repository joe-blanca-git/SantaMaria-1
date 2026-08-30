import io
import math
import datetime
from typing import Optional, Tuple

import pandas as pd
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.cliente import Cliente
from app.models.matriz_cliente import MatrizCliente
from app.models.unidade import Unidade
from app.models.nf_pendencia import NfPendencia
from app.models.tratativa import Tratativa
from app.models.historico_pendencia import HistoricoPendencia
from app.models.user import User
from app.services.importacao_service import ImportacaoService

# Excel armazena datas como número de dias a partir de 1899-12-30 (compatibilidade com o bug histórico do Lotus 1-2-3)
EXCEL_EPOCH = datetime.date(1899, 12, 30)

WEEKDAY_NOMES = [
    "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira",
    "sexta-feira", "sábado", "domingo"
]

# Mesmas fases usadas como colunas do Kanban de Pendências (tela) e mesmos status
# disponíveis no select do modal de detalhes - mantidos em sincronia com o frontend.
FASE_OPTIONS = ["PENDENCIAS", "LOGISTICA", "FISCAL", "COMERCIAL", "FINANCEIRO", "FINALIZADO"]
STATUS_OPTIONS = [
    "DEVOLUCAO", "SEM DATA DE ENTREGA", "ACORDO", "COMISSAO",
    "EXPORTACAO", "MARTINS", "MERCADINHO", "CART-DES", "ATRASADO", "ANALISAR",
    "PROTESTADO", "PERDAS"
]


def _excel_serial_to_date(value) -> Optional[datetime.date]:
    """
    Converte uma célula de data da planilha para datetime.date, aceitando os dois formatos
    que já apareceram nos arquivos reais: número de série do Excel (quando a célula não tem
    formatação de data aplicada) ou um valor já parseado pelo pandas como Timestamp/datetime
    (quando a célula tem formatação de data - caso em que o cast direto para int() falharia
    silenciosamente e derrubava todo o filtro de vencimento para 0 linhas elegíveis).
    """
    if value is None:
        return None
    try:
        if pd.isna(value):
            return None
    except (TypeError, ValueError):
        pass
    if isinstance(value, datetime.datetime):
        return value.date()
    if isinstance(value, datetime.date):
        return value
    try:
        return EXCEL_EPOCH + datetime.timedelta(days=int(value))
    except (ValueError, OverflowError, TypeError):
        return None


def _clean_str(value) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, float) and math.isnan(value):
        return None
    texto = str(value).strip()
    return texto or None


def _to_float(value) -> Optional[float]:
    if value is None:
        return None
    if isinstance(value, float) and math.isnan(value):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _to_int(value) -> Optional[int]:
    valor_float = _to_float(value)
    if valor_float is None:
        return None
    return int(round(valor_float))


def _clean_titulo(value) -> Optional[str]:
    """Título é texto (ex.: '0017356', '270826-3') - preserva zeros à esquerda e sufixos,
    só removendo o '.0' que aparece quando a célula é lida como número puro pelo pandas."""
    texto = _clean_str(value)
    if texto is None:
        return None
    if texto.endswith(".0"):
        texto = texto[:-2]
    return texto or None


def resolver_intervalo_vencimento(hoje: datetime.date) -> Tuple[datetime.date, datetime.date]:
    """
    Primeiro critério de importação: a janela de datas de vencimento (coluna P) elegível
    depende do dia da semana em que a importação é executada.
      - Segunda-feira: sexta-feira anterior (último dia útil antes do fim de semana).
      - Terça-feira: sábado anterior até segunda anterior (fim de semana + segunda que antecedem a terça).
      - Quarta, quinta ou sexta-feira: exatamente o dia anterior.
    Sábado e domingo não têm regra definida e devem bloquear a importação.
    """
    dia_semana = hoje.weekday()  # 0=segunda ... 6=domingo
    if dia_semana == 0:  # segunda-feira
        sexta_anterior = hoje - datetime.timedelta(days=3)
        return sexta_anterior, sexta_anterior
    if dia_semana == 1:  # terça-feira
        inicio = hoje - datetime.timedelta(days=3)  # sábado anterior
        fim = hoje - datetime.timedelta(days=1)  # segunda anterior
        return inicio, fim
    if dia_semana in (2, 3, 4):  # quarta, quinta, sexta
        ontem = hoje - datetime.timedelta(days=1)
        return ontem, ontem
    raise ValueError(
        f"Importação de pendências não definida para {WEEKDAY_NOMES[dia_semana]}. "
        "As regras cobrem segunda-feira (sexta-feira anterior), terça-feira (fim de semana "
        "anterior) e quarta, quinta ou sexta-feira (dia anterior)."
    )


def classificar_fase_status(
    especie: Optional[str],
    tipo_pedido: Optional[str],
    carteira: Optional[str],
    tem_data_entrega: bool,
    valor_original: Optional[float],
    saldo: Optional[float],
) -> Tuple[Optional[str], Optional[str]]:
    """
    Critérios 3 a 6: define (fase, status) a partir das colunas B (espécie), G (tipo pedido),
    M (carteira) e O (data de entrega), e da comparação Saldo (U) x Valor Original (T).
    As regras são avaliadas na ordem descrita pelo negócio - a primeira que casar decide o
    resultado (existem combinações que se sobrepõem, ex.: DP+DEV também podendo ser DP+PV+O vazio).
    """
    b = (especie or "").upper()
    g = (tipo_pedido or "").upper()
    m = (carteira or "").upper()
    saldo_menor_que_original = (
        saldo is not None and valor_original is not None and saldo < valor_original
    )

    # 3º critério - LOGISTICA
    if b == "DP" and m == "DEV":
        return "LOGISTICA", "DEVOLUCAO"
    if b == "DP" and g == "PV" and not tem_data_entrega:
        return "LOGISTICA", "SEM DATA DE ENTREGA"

    # 4º critério - COMERCIAL
    if b == "DP" and g == "PV" and tem_data_entrega and m == "CAR" and saldo_menor_que_original:
        return "COMERCIAL", "ACORDO"

    # 5º critério - FISCAL
    if b == "DP" and g == "ER" and tem_data_entrega and m == "CAR" and saldo_menor_que_original:
        return "FISCAL", "COMISSAO"

    # 6º critério - PENDENCIAS / FINANCEIRO
    if b == "AD":
        return "PENDENCIAS", "AD"
    if b == "AN":
        return "PENDENCIAS", "AN"
    if b == "DP" and g == "PX" and not tem_data_entrega:
        return "PENDENCIAS", "EXPORTACAO"
    if b == "DP" and g == "ER" and not tem_data_entrega:
        return "PENDENCIAS", "MARTINS"
    if b == "DP" and g == "E1" and not tem_data_entrega:
        return "PENDENCIAS", "MERCADINHO"
    if b == "DP" and g == "PV" and m == "DES" and tem_data_entrega:
        return "PENDENCIAS", "CART-DES"
    if b == "DP" and g == "PV" and m in ("SIM", "VIN") and tem_data_entrega:
        return "FINANCEIRO", "ATRASADO"

    return None, None


class InadimplenciaService:
    # Índices das colunas (0-based) no layout fixo da planilha "Base pendencias.xlsx"
    COL_ESTABELECIMENTO = 0   # A - Est (mapeia para unidade.codigo)
    COL_ESPECIE = 1           # B - Esp
    COL_SERIE = 2             # C - Ser
    COL_TITULO = 3            # D - Título
    COL_PARCELA = 4           # E - /P
    COL_NR_PEDIDO_CLIENTE = 5  # F - Nr Pedcli
    COL_TIPO_PEDIDO = 6       # G - Tipo Pedido
    COL_CLIENTE_CODIGO = 7    # H - Cliente
    COL_NOME_CLIENTE = 9      # J - Nome Cliente
    COL_MATRIZ_CODIGO = 10    # K - Cliente Matriz
    COL_PORTADOR = 11         # L - Port
    COL_CARTEIRA = 12         # M - Cart
    COL_EMISSAO = 13          # N - Emissão
    COL_DATA_ENTREGA = 14     # O - Dt Entrega
    COL_VENCIMENTO = 15       # P - Vencto
    COL_VALOR_ORIGINAL = 19   # T - Val Original
    COL_SALDO = 20            # U - Saldo

    MIN_COLUNAS = 21  # até a coluna U

    def __init__(self, db: Session):
        self.db = db
        self._cache_clientes: dict[int, int] = {}
        self._cache_matrizes: dict[int, int] = {}
        self._cache_unidades: dict[int, Optional[int]] = {}

    def importar_pendencias(self, conteudo: bytes, nome_arquivo: str, id_user: Optional[int] = None) -> dict:
        try:
            df = pd.read_excel(io.BytesIO(conteudo), header=0)
        except Exception as exc:
            raise ValueError(f"Não foi possível ler a planilha: {exc}")

        if df.shape[1] < self.MIN_COLUNAS:
            raise ValueError(
                f"A planilha precisa ter pelo menos {self.MIN_COLUNAS} colunas (até a coluna U). "
                f"Colunas encontradas: {df.shape[1]}."
            )

        total_com_especie = 0
        importadas = 0
        classificadas_por_fallback = 0
        ignoradas_sem_cliente = 0
        ignoradas_sem_vencimento = 0
        ignoradas_duplicadas = 0
        sem_unidade_encontrada = 0
        clientes_criados = 0
        matrizes_criadas = 0
        finalizadas_automaticamente = 0
        resumo_fase_status: dict[str, int] = {}

        # Chave natural (mesma usada para dedup) de toda linha real da planilha, independente
        # da data - usada ao final para fechar automaticamente pendências que já não aparecem
        # mais no export do ERP (critério de finalização automática).
        chaves_presentes_planilha: set[Tuple[Optional[int], Optional[int], Optional[str], Optional[float]]] = set()

        extensao = nome_arquivo.rsplit(".", 1)[-1].lower() if "." in nome_arquivo else "xlsx"

        # Primeiro critério de processo: registra a importação antes de processar as linhas.
        importacao = ImportacaoService(self.db).registrar_importacao(
            nome_arquivo=nome_arquivo,
            extensao=extensao,
            tipo="PENDENCIAS",
            id_user_inc=id_user
        )

        try:
            for _, row in df.iterrows():
                especie = _clean_str(row.iloc[self.COL_ESPECIE])
                if not especie:
                    continue  # linha em branco / separador / rodapé do relatório

                total_com_especie += 1

                # Chave natural computada para TODA linha real, usada tanto para o dedup
                # quanto para o critério de finalização automática (saber se o título ainda
                # existe em algum lugar da planilha).
                codigo_estabelecimento = _to_int(row.iloc[self.COL_ESTABELECIMENTO])
                id_unidade = self._buscar_unidade(codigo_estabelecimento)
                if codigo_estabelecimento is not None and id_unidade is None:
                    sem_unidade_encontrada += 1

                serie = _to_int(row.iloc[self.COL_SERIE])
                titulo = _clean_titulo(row.iloc[self.COL_TITULO])
                parcela = _to_float(row.iloc[self.COL_PARCELA])
                if titulo is not None:
                    chaves_presentes_planilha.add((id_unidade, serie, titulo, parcela))

                # A importação agora traz todo o conteúdo da planilha (não só o que vence
                # hoje) - o recorte por data vira um filtro de consulta na tela de Pendências.
                vencimento = _excel_serial_to_date(row.iloc[self.COL_VENCIMENTO])
                if vencimento is None:
                    ignoradas_sem_vencimento += 1
                    continue

                tipo_pedido = _clean_str(row.iloc[self.COL_TIPO_PEDIDO])
                carteira = _clean_str(row.iloc[self.COL_CARTEIRA])
                data_entrega = _excel_serial_to_date(row.iloc[self.COL_DATA_ENTREGA])
                valor_original = _to_float(row.iloc[self.COL_VALOR_ORIGINAL])
                saldo = _to_float(row.iloc[self.COL_SALDO])

                fase, status = classificar_fase_status(
                    especie, tipo_pedido, carteira,
                    tem_data_entrega=data_entrega is not None,
                    valor_original=valor_original,
                    saldo=saldo,
                )

                # Sétimo critério: elegível pela data mas não bateu com nenhuma regra 3-6
                # específica - ainda assim entra, marcado para triagem manual.
                if fase is None:
                    fase, status = "PENDENCIAS", "ANALISAR"
                    classificadas_por_fallback += 1

                codigo_cliente = _to_int(row.iloc[self.COL_CLIENTE_CODIGO])
                nome_cliente = _clean_str(row.iloc[self.COL_NOME_CLIENTE])

                if codigo_cliente is None or not nome_cliente:
                    ignoradas_sem_cliente += 1
                    continue

                id_cliente, criado_cliente = self._obter_ou_criar_cliente(codigo_cliente, nome_cliente)
                if criado_cliente:
                    clientes_criados += 1

                codigo_matriz = _to_int(row.iloc[self.COL_MATRIZ_CODIGO])
                id_matriz = None
                if codigo_matriz is not None:
                    id_matriz, criado_matriz = self._obter_ou_criar_matriz(codigo_matriz)
                    if criado_matriz:
                        matrizes_criadas += 1

                # Não pode subir nota repetida: mesma unidade + série + título + parcela já
                # existente não é reinserida (não há constraint de unicidade no banco).
                if self._ja_importada(id_unidade, serie, titulo, parcela):
                    ignoradas_duplicadas += 1
                    continue

                nf = NfPendencia(
                    idUnidade=id_unidade,
                    idImportacoes=importacao.idImportacoes,
                    especie=especie,
                    serie=serie,
                    titulo=titulo,
                    parccela=parcela,
                    nrPedidoCliente=_to_int(row.iloc[self.COL_NR_PEDIDO_CLIENTE]),
                    tipoPedido=tipo_pedido,
                    idCliente=id_cliente,
                    idClienteMatriz=id_matriz,
                    portador=_to_int(row.iloc[self.COL_PORTADOR]),
                    carteira=carteira,
                    dtEmissao=_excel_serial_to_date(row.iloc[self.COL_EMISSAO]),
                    dtEntrega=data_entrega,
                    dtVencimento=vencimento,
                    valorOriginal=valor_original,
                    valorSaldo=saldo,
                    fase=fase,
                    status=status,
                )
                self.db.add(nf)
                self.db.flush()  # popula nf.idnfpendencias para o registro de histórico abaixo
                self._novo_historico(
                    nf.idnfpendencias,
                    "Pendencia Importada",
                    f"Título {titulo} importado da planilha '{nome_arquivo}' e classificado como {fase} / {status}.",
                    id_user,
                )
                importadas += 1
                chave = f"{fase} / {status}"
                resumo_fase_status[chave] = resumo_fase_status.get(chave, 0) + 1

            # Critério de finalização automática: qualquer pendência que já esteja cadastrada
            # (fase != FINALIZADO) e não apareça mais em nenhuma linha da planilha atual foi
            # paga/baixada no ERP de origem - fecha automaticamente, independente de data.
            notas_em_aberto = (
                self.db.query(NfPendencia)
                .filter(or_(NfPendencia.fase != "FINALIZADO", NfPendencia.fase.is_(None)))
                .all()
            )
            for nota in notas_em_aberto:
                if nota.titulo is None:
                    continue
                chave_nota = (nota.idUnidade, nota.serie, nota.titulo, nota.parccela)
                if chave_nota in chaves_presentes_planilha:
                    continue

                fase_anterior = nota.fase or "-"
                nota.fase = "FINALIZADO"
                self._novo_historico(
                    nota.idnfpendencias,
                    "Finalização Automática",
                    f"Fase alterada automaticamente de '{fase_anterior}' para 'FINALIZADO' - título "
                    f"não encontrado na planilha '{nome_arquivo}' (considerado quitado/baixado no ERP).",
                    id_user,
                )
                finalizadas_automaticamente += 1

            self.db.commit()
        except Exception:
            self.db.rollback()
            raise

        return {
            "sucesso": True,
            "arquivo": nome_arquivo,
            "idImportacao": importacao.idImportacoes,
            "totalLinhasComEspecie": total_com_especie,
            "importadas": importadas,
            "classificadasPorFallback": classificadas_por_fallback,
            "ignoradasSemCliente": ignoradas_sem_cliente,
            "ignoradasSemVencimento": ignoradas_sem_vencimento,
            "ignoradasDuplicadas": ignoradas_duplicadas,
            "semUnidadeEncontrada": sem_unidade_encontrada,
            "clientesCriados": clientes_criados,
            "matrizesCriadas": matrizes_criadas,
            "finalizadasAutomaticamente": finalizadas_automaticamente,
            "resumoPorFaseStatus": resumo_fase_status,
        }

    def listar_pendencias(
        self,
        vencimento_inicio: Optional[datetime.date] = None,
        vencimento_fim: Optional[datetime.date] = None,
    ) -> list[dict]:
        """
        Lista as nfpendencias já classificadas para alimentar o Kanban, já com o nome do
        cliente resolvido (join com clientes). Não pagina - o board mostra o total do filtro.

        Sem parâmetros, mostra o padrão da tela: tudo com vencimento menor que hoje (vencido).
        Com vencimento_inicio/vencimento_fim, filtra pelo intervalo informado (ex.: o atalho
        "Regra do Dia" ou um período personalizado escolhido na tela).
        """
        query = self.db.query(NfPendencia, Cliente.nome).outerjoin(
            Cliente, NfPendencia.idCliente == Cliente.idclientes
        )

        if vencimento_inicio is None and vencimento_fim is None:
            query = query.filter(NfPendencia.dtVencimento < datetime.date.today())
        else:
            if vencimento_inicio is not None:
                query = query.filter(NfPendencia.dtVencimento >= vencimento_inicio)
            if vencimento_fim is not None:
                query = query.filter(NfPendencia.dtVencimento <= vencimento_fim)

        registros = query.order_by(NfPendencia.dtVencimento.asc()).all()

        return [
            {
                "idnfpendencias": nf.idnfpendencias,
                "titulo": nf.titulo,
                "fase": nf.fase,
                "status": nf.status,
                "clienteNome": nome_cliente,
                "dtVencimento": nf.dtVencimento.isoformat() if nf.dtVencimento else None,
                "createdAt": nf.createdAt.isoformat() if nf.createdAt else None,
            }
            for nf, nome_cliente in registros
        ]

    def obter_janela_regra_dia(self) -> dict:
        """
        Expõe a mesma regra de dia da semana (critério 1) como uma janela de datas pronta
        para o atalho "Regra do Dia" do filtro de período - não bloqueia mais a importação,
        só informa qual seria a janela de vencimento "do dia" hoje, se houver uma definida.
        """
        hoje = datetime.date.today()
        try:
            inicio, fim = resolver_intervalo_vencimento(hoje)
        except ValueError:
            return {
                "aplicavel": False,
                "diaSemanaHoje": WEEKDAY_NOMES[hoje.weekday()],
            }
        return {
            "aplicavel": True,
            "inicio": inicio.isoformat(),
            "fim": fim.isoformat(),
            "diaSemanaHoje": WEEKDAY_NOMES[hoje.weekday()],
        }

    def alterar_fase(self, id_nf: int, nova_fase: str, id_user: Optional[int] = None) -> dict:
        nova_fase = (nova_fase or "").strip().upper()
        if nova_fase not in FASE_OPTIONS:
            raise ValueError(
                f"Fase inválida: '{nova_fase}'. Valores aceitos: {', '.join(FASE_OPTIONS)}."
            )

        nf = self.db.query(NfPendencia).filter(NfPendencia.idnfpendencias == id_nf).first()
        if not nf:
            raise LookupError(f"Pendência {id_nf} não encontrada.")

        fase_anterior = nf.fase or "-"
        nf.fase = nova_fase
        self._novo_historico(
            id_nf, "Alteração de Fase",
            f"Fase alterada de '{fase_anterior}' para '{nova_fase}'.",
            id_user,
        )
        self.db.commit()
        self.db.refresh(nf)
        return {"idnfpendencias": nf.idnfpendencias, "fase": nf.fase}

    def alterar_status(self, id_nf: int, novo_status: str, id_user: Optional[int] = None) -> dict:
        novo_status = (novo_status or "").strip().upper()
        if novo_status not in STATUS_OPTIONS:
            raise ValueError(
                f"Status inválido: '{novo_status}'. Valores aceitos: {', '.join(STATUS_OPTIONS)}."
            )

        nf = self.db.query(NfPendencia).filter(NfPendencia.idnfpendencias == id_nf).first()
        if not nf:
            raise LookupError(f"Pendência {id_nf} não encontrada.")

        status_anterior = nf.status or "-"
        nf.status = novo_status
        self._novo_historico(
            id_nf, "Alteração de Status",
            f"Status alterado de '{status_anterior}' para '{novo_status}'.",
            id_user,
        )
        self.db.commit()
        self.db.refresh(nf)
        return {"idnfpendencias": nf.idnfpendencias, "status": nf.status}

    # ------------------------------------------------------------
    # Tratativas
    # ------------------------------------------------------------
    def listar_tratativas(self, id_nf: int) -> list[dict]:
        nf = self.db.query(NfPendencia).filter(NfPendencia.idnfpendencias == id_nf).first()
        if not nf:
            raise LookupError(f"Pendência {id_nf} não encontrada.")

        tratativas = (
            self.db.query(Tratativa)
            .filter(Tratativa.idNfPendencias == id_nf)
            .order_by(Tratativa.createdAt.desc())
            .all()
        )
        return [self._serializar_tratativa(t) for t in tratativas]

    def criar_tratativa(self, id_nf: int, conteudo: str, id_user: Optional[int]) -> dict:
        conteudo = (conteudo or "").strip()
        if not conteudo:
            raise ValueError("O conteúdo da tratativa não pode ser vazio.")

        nf = self.db.query(NfPendencia).filter(NfPendencia.idnfpendencias == id_nf).first()
        if not nf:
            raise LookupError(f"Pendência {id_nf} não encontrada.")

        tratativa = Tratativa(idNfPendencias=id_nf, conteudo=conteudo, idCreatedUser=id_user)
        self.db.add(tratativa)
        self._novo_historico(id_nf, "Tratativa Registrada", conteudo, id_user)
        self.db.commit()
        self.db.refresh(tratativa)
        return self._serializar_tratativa(tratativa)

    def editar_tratativa(self, id_tratativa: int, novo_conteudo: str) -> dict:
        novo_conteudo = (novo_conteudo or "").strip()
        if not novo_conteudo:
            raise ValueError("O conteúdo da tratativa não pode ser vazio.")

        tratativa = self.db.query(Tratativa).filter(Tratativa.idtratativas == id_tratativa).first()
        if not tratativa:
            raise LookupError(f"Tratativa {id_tratativa} não encontrada.")

        tratativa.conteudo = novo_conteudo
        self.db.commit()
        self.db.refresh(tratativa)
        return self._serializar_tratativa(tratativa)

    def _serializar_tratativa(self, t: Tratativa) -> dict:
        return {
            "idtratativas": t.idtratativas,
            "idNfPendencias": t.idNfPendencias,
            "conteudo": t.conteudo,
            "createdAt": t.createdAt.isoformat() if t.createdAt else None,
            "autor": t.usuario.name if t.usuario else None,
        }

    # ------------------------------------------------------------
    # Histórico
    # ------------------------------------------------------------
    def listar_historico(self, id_nf: int) -> list[dict]:
        nf = self.db.query(NfPendencia).filter(NfPendencia.idnfpendencias == id_nf).first()
        if not nf:
            raise LookupError(f"Pendência {id_nf} não encontrada.")

        eventos = (
            self.db.query(HistoricoPendencia)
            .filter(HistoricoPendencia.idNfPendencias == id_nf)
            .order_by(HistoricoPendencia.createdAt.asc())
            .all()
        )
        return [self._serializar_historico(h) for h in eventos]

    def registrar_historico(self, id_nf: int, tipo: str, observacao: str, id_user: Optional[int] = None) -> dict:
        """Endpoint público para registrar um evento manualmente (uso avulso, fora do fluxo
        automático já plugado em importação/alteração de fase-status/tratativa)."""
        tipo = (tipo or "").strip()
        if not tipo:
            raise ValueError("O tipo do evento de histórico é obrigatório.")

        nf = self.db.query(NfPendencia).filter(NfPendencia.idnfpendencias == id_nf).first()
        if not nf:
            raise LookupError(f"Pendência {id_nf} não encontrada.")

        historico = self._novo_historico(id_nf, tipo, observacao, id_user)
        self.db.commit()
        self.db.refresh(historico)
        return self._serializar_historico(historico)

    def _novo_historico(self, id_nf: int, tipo: str, observacao: Optional[str], id_user: Optional[int]) -> HistoricoPendencia:
        """Cria o registro e adiciona à sessão sem commitar - quem chama decide quando
        commitar (normalmente junto com a alteração principal, na mesma transação)."""
        historico = HistoricoPendencia(
            idNfPendencias=id_nf,
            tipo=tipo,
            observacao=(observacao or "")[:500],
            idUserCreated=id_user,
        )
        self.db.add(historico)
        return historico

    def _serializar_historico(self, h: HistoricoPendencia) -> dict:
        return {
            "idhistoricopendencia": h.idhistoricopendencia,
            "idNfPendencias": h.idNfPendencias,
            "tipo": h.tipo,
            "observacao": h.observacao,
            "createdAt": h.createdAt.isoformat() if h.createdAt else None,
            "autor": h.usuario.name if h.usuario else None,
        }

    def _obter_ou_criar_cliente(self, codigo: int, nome: str) -> Tuple[int, bool]:
        if codigo in self._cache_clientes:
            return self._cache_clientes[codigo], False

        cliente = self.db.query(Cliente).filter(Cliente.codigo == codigo).first()
        if cliente:
            self._cache_clientes[codigo] = cliente.idclientes
            return cliente.idclientes, False

        cliente = Cliente(codigo=codigo, nome=nome)
        self.db.add(cliente)
        self.db.flush()
        self._cache_clientes[codigo] = cliente.idclientes
        return cliente.idclientes, True

    def _obter_ou_criar_matriz(self, codigo: int) -> Tuple[int, bool]:
        if codigo in self._cache_matrizes:
            return self._cache_matrizes[codigo], False

        matriz = self.db.query(MatrizCliente).filter(MatrizCliente.codigo == codigo).first()
        if matriz:
            self._cache_matrizes[codigo] = matriz.idmatrizCliente
            return matriz.idmatrizCliente, False

        matriz = MatrizCliente(codigo=codigo)
        self.db.add(matriz)
        self.db.flush()
        self._cache_matrizes[codigo] = matriz.idmatrizCliente
        return matriz.idmatrizCliente, True

    def _buscar_unidade(self, codigo_estabelecimento: Optional[int]) -> Optional[int]:
        """Apenas consulta - não cadastra unidade automaticamente (fora do escopo pedido)."""
        if codigo_estabelecimento is None:
            return None
        if codigo_estabelecimento in self._cache_unidades:
            return self._cache_unidades[codigo_estabelecimento]

        unidade = self.db.query(Unidade).filter(Unidade.codigo == codigo_estabelecimento).first()
        id_unidade = unidade.idUnidade if unidade else None
        self._cache_unidades[codigo_estabelecimento] = id_unidade
        return id_unidade

    def _ja_importada(
        self,
        id_unidade: Optional[int],
        serie: Optional[int],
        titulo: Optional[str],
        parcela: Optional[float],
    ) -> bool:
        if titulo is None:
            return False
        existente = self.db.query(NfPendencia.idnfpendencias).filter(
            NfPendencia.idUnidade == id_unidade,
            NfPendencia.serie == serie,
            NfPendencia.titulo == titulo,
            NfPendencia.parccela == parcela,
        ).first()
        return existente is not None
