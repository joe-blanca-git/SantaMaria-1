from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.plano_saude import (
    ConfirmarImportacaoSorrisoPayload,
    ConfirmarImportacaoUnimedPayload,
    ExportarSorrisoExcelPayload,
    ExportarUnimedExcelPayload,
)
from app.services.plano_saude_ia_service import PlanoSaudeIAService

router = APIRouter()


@router.post("/universal/analisar")
async def analisar_plano_saude_universal(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Rota universal para análise de PDFs de planos de saúde, odontológicos e seguros.
    Usa parsing determinístico (regex) — sem IA. Instantâneo e 100% confiável."""
    try:
        return await PlanoSaudeIAService(db).analisar_universal(file)
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sorriso/analisar")
async def analisar_plano_saude_sorriso(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    try:
        return await PlanoSaudeIAService(db).analisar_sorriso(file)
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sorriso/confirmar")
def confirmar_importacao_plano_saude_sorriso(
    payload: ConfirmarImportacaoSorrisoPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return PlanoSaudeIAService(db).confirmar_sorriso(payload, current_user)
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sorriso/exportar")
def exportar_sorriso_excel(payload: ExportarSorrisoExcelPayload):
    try:
        return PlanoSaudeIAService.exportar_sorriso(payload)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/unimed-odonto/analisar")
async def analisar_plano_saude_unimed_odonto(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    try:
        return await PlanoSaudeIAService(db).analisar_unimed_odonto(file)
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/unimed-odonto/confirmar")
def confirmar_importacao_plano_saude_unimed_odonto(
    payload: ConfirmarImportacaoUnimedPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return PlanoSaudeIAService(db).confirmar_unimed_odonto(payload, current_user)
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/unimed-odonto/exportar")
def exportar_unimed_odonto_excel(payload: ExportarUnimedExcelPayload):
    try:
        return PlanoSaudeIAService.exportar_unimed_odonto(payload)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
