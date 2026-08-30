-- MySQL Workbench Forward Engineering

SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- -----------------------------------------------------
-- Schema mydb
-- -----------------------------------------------------
-- -----------------------------------------------------
-- Schema stamariabd
-- -----------------------------------------------------

-- -----------------------------------------------------
-- Schema stamariabd
-- -----------------------------------------------------
CREATE SCHEMA IF NOT EXISTS `stamariabd` DEFAULT CHARACTER SET utf8mb3 ;
USE `stamariabd` ;

-- -----------------------------------------------------
-- Table `stamariabd`.`cargocolaborador`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `stamariabd`.`cargocolaborador` (
  `idCargoColaborador` INT NOT NULL AUTO_INCREMENT,
  `Nome` VARCHAR(45) NULL DEFAULT NULL,
  `Descricao` VARCHAR(100) NULL DEFAULT NULL,
  `createdAt` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAte` DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (`idCargoColaborador`))
ENGINE = InnoDB
AUTO_INCREMENT = 154
DEFAULT CHARACTER SET = utf8mb3;


-- -----------------------------------------------------
-- Table `stamariabd`.`categorias`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `stamariabd`.`categorias` (
  `idCategorias` INT NOT NULL AUTO_INCREMENT,
  `nome` VARCHAR(50) NULL DEFAULT NULL,
  `descricao` VARCHAR(45) NULL DEFAULT NULL,
  `createdAt` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAte` DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (`idCategorias`))
ENGINE = InnoDB
AUTO_INCREMENT = 11
DEFAULT CHARACTER SET = utf8mb3;


-- -----------------------------------------------------
-- Table `stamariabd`.`centrocusto`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `stamariabd`.`centrocusto` (
  `idCentroCusto` INT NOT NULL AUTO_INCREMENT,
  `codigo` INT NOT NULL,
  `nome` VARCHAR(85) NOT NULL,
  PRIMARY KEY (`idCentroCusto`, `codigo`))
ENGINE = InnoDB
AUTO_INCREMENT = 274
DEFAULT CHARACTER SET = utf8mb3;


-- -----------------------------------------------------
-- Table `stamariabd`.`centroestado`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `stamariabd`.`centroestado` (
  `idCentroCusto` INT NOT NULL,
  `estado` VARCHAR(200) NOT NULL,
  INDEX `centroEsta_idx` (`idCentroCusto` ASC) VISIBLE,
  CONSTRAINT `centroEsta`
    FOREIGN KEY (`idCentroCusto`)
    REFERENCES `stamariabd`.`centrocusto` (`idCentroCusto`)
    ON DELETE CASCADE
    ON UPDATE CASCADE)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb3;


-- -----------------------------------------------------
-- Table `stamariabd`.`unidade`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `stamariabd`.`unidade` (
  `idUnidade` INT NOT NULL AUTO_INCREMENT,
  `codigo` INT NOT NULL,
  `descricao` VARCHAR(50) NOT NULL,
  PRIMARY KEY (`idUnidade`))
ENGINE = InnoDB
AUTO_INCREMENT = 5
DEFAULT CHARACTER SET = utf8mb3;


-- -----------------------------------------------------
-- Table `stamariabd`.`colaboradores`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `stamariabd`.`colaboradores` (
  `nome` VARCHAR(80) NOT NULL,
  `papel` VARCHAR(45) NULL DEFAULT NULL,
  `idColaborador` INT NOT NULL AUTO_INCREMENT,
  `idCargoColaborador` INT NOT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NULL DEFAULT NULL,
  `idCentroCusto` INT NOT NULL,
  `idUnidade` INT NULL DEFAULT NULL,
  PRIMARY KEY (`idColaborador`),
  INDEX `colabCentroCusto_idx` (`idCentroCusto` ASC) VISIBLE,
  INDEX `colabUnid_idx` (`idUnidade` ASC) VISIBLE,
  INDEX `colabCargo_idx` (`idCargoColaborador` ASC) VISIBLE,
  CONSTRAINT `colabCargo`
    FOREIGN KEY (`idCargoColaborador`)
    REFERENCES `stamariabd`.`cargocolaborador` (`idCargoColaborador`),
  CONSTRAINT `colabCentroCusto`
    FOREIGN KEY (`idCentroCusto`)
    REFERENCES `stamariabd`.`centrocusto` (`idCentroCusto`),
  CONSTRAINT `colabUnid`
    FOREIGN KEY (`idUnidade`)
    REFERENCES `stamariabd`.`unidade` (`idUnidade`))
ENGINE = InnoDB
AUTO_INCREMENT = 1093
DEFAULT CHARACTER SET = utf8mb3;


-- -----------------------------------------------------
-- Table `stamariabd`.`colaborador_aliases`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `stamariabd`.`colaborador_aliases` (
  `idAlias` INT NOT NULL AUTO_INCREMENT,
  `idColaborador` INT NOT NULL,
  `nome_divergente` VARCHAR(120) NOT NULL,
  `createdAt` DATETIME NOT NULL,
  `updatedAt` DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (`idAlias`),
  UNIQUE INDEX `ix_colaborador_aliases_nome_divergente` (`nome_divergente` ASC) VISIBLE,
  INDEX `idColaborador` (`idColaborador` ASC) VISIBLE,
  INDEX `ix_colaborador_aliases_idAlias` (`idAlias` ASC) VISIBLE,
  CONSTRAINT `colaborador_aliases_ibfk_1`
    FOREIGN KEY (`idColaborador`)
    REFERENCES `stamariabd`.`colaboradores` (`idColaborador`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb3;


-- -----------------------------------------------------
-- Table `stamariabd`.`empresas`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `stamariabd`.`empresas` (
  `idEmpresas` INT NOT NULL AUTO_INCREMENT,
  `nome` VARCHAR(80) NOT NULL,
  `descricao` VARCHAR(200) NULL DEFAULT NULL,
  `createdAt` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAte` DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (`idEmpresas`))
ENGINE = InnoDB
AUTO_INCREMENT = 24
DEFAULT CHARACTER SET = utf8mb3;


-- -----------------------------------------------------
-- Table `stamariabd`.`modulos`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `stamariabd`.`modulos` (
  `idmodulos` INT NOT NULL AUTO_INCREMENT,
  `Descricao` VARCHAR(45) NULL DEFAULT NULL,
  `createdAt` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAte` DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (`idmodulos`))
ENGINE = InnoDB
AUTO_INCREMENT = 3
DEFAULT CHARACTER SET = utf8mb3;


-- -----------------------------------------------------
-- Table `stamariabd`.`empresamodulo`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `stamariabd`.`empresamodulo` (
  `idempresamodulo` INT NOT NULL AUTO_INCREMENT,
  `idEmpresas` INT NOT NULL,
  `idModulos` INT NOT NULL,
  PRIMARY KEY (`idempresamodulo`),
  INDEX `empresaFk_idx` (`idEmpresas` ASC) VISIBLE,
  INDEX `modulo_idx` (`idModulos` ASC) VISIBLE,
  CONSTRAINT `empresaFk`
    FOREIGN KEY (`idEmpresas`)
    REFERENCES `stamariabd`.`empresas` (`idEmpresas`),
  CONSTRAINT `modulo`
    FOREIGN KEY (`idModulos`)
    REFERENCES `stamariabd`.`modulos` (`idmodulos`))
ENGINE = InnoDB
AUTO_INCREMENT = 22
DEFAULT CHARACTER SET = utf8mb3;


-- -----------------------------------------------------
-- Table `stamariabd`.`importacoes`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `stamariabd`.`importacoes` (
  `idImportacoes` INT NOT NULL AUTO_INCREMENT,
  `nomeArquivo` VARCHAR(200) NOT NULL,
  `extensaoArquivo` VARCHAR(10) NOT NULL,
  `idEmpresa` INT NULL DEFAULT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAte` DATETIME NULL DEFAULT NULL,
  `tipo` VARCHAR(45) NOT NULL,
  PRIMARY KEY (`idImportacoes`),
  INDEX `importEmpresa_idx` (`idEmpresa` ASC) VISIBLE,
  CONSTRAINT `importEmpresa`
    FOREIGN KEY (`idEmpresa`)
    REFERENCES `stamariabd`.`empresas` (`idEmpresas`))
ENGINE = InnoDB
AUTO_INCREMENT = 112
DEFAULT CHARACTER SET = utf8mb3;


-- -----------------------------------------------------
-- Table `stamariabd`.`movimentacoes`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `stamariabd`.`movimentacoes` (
  `idMovimentacoes` INT NOT NULL AUTO_INCREMENT,
  `idCategoria` INT NOT NULL,
  `idColaborador` INT NOT NULL,
  `idEmpresa` INT NOT NULL,
  `idImportacoes` INT NOT NULL,
  `valor` FLOAT(18,2) NOT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAte` DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (`idMovimentacoes`),
  INDEX `movCategoria_idx` (`idCategoria` ASC) VISIBLE,
  INDEX `movEmpresa_idx` (`idEmpresa` ASC) VISIBLE,
  INDEX `movColaborador_idx` (`idColaborador` ASC) VISIBLE,
  INDEX `movImport` (`idImportacoes` ASC) VISIBLE,
  CONSTRAINT `movCategoria`
    FOREIGN KEY (`idCategoria`)
    REFERENCES `stamariabd`.`categorias` (`idCategorias`),
  CONSTRAINT `movColaborador`
    FOREIGN KEY (`idColaborador`)
    REFERENCES `stamariabd`.`colaboradores` (`idColaborador`),
  CONSTRAINT `movEmpresa`
    FOREIGN KEY (`idEmpresa`)
    REFERENCES `stamariabd`.`empresas` (`idEmpresas`),
  CONSTRAINT `movImport`
    FOREIGN KEY (`idImportacoes`)
    REFERENCES `stamariabd`.`importacoes` (`idImportacoes`)
    ON DELETE CASCADE)
ENGINE = InnoDB
AUTO_INCREMENT = 316
DEFAULT CHARACTER SET = utf8mb3;


-- -----------------------------------------------------
-- Table `stamariabd`.`clientes`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `stamariabd`.`clientes` (
  `idCliente` INT NOT NULL AUTO_INCREMENT,
  `codigo` INT NOT NULL,
  `nome` VARCHAR(150) NOT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (`idCliente`),
  UNIQUE INDEX `codigo_UNIQUE` (`codigo` ASC) VISIBLE)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb3;


-- -----------------------------------------------------
-- Table `stamariabd`.`matrizCliente`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `stamariabd`.`matrizCliente` (
  `idMatrizCliente` INT NOT NULL AUTO_INCREMENT,
  `codigo` INT NOT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (`idMatrizCliente`),
  UNIQUE INDEX `codigo_UNIQUE` (`codigo` ASC) VISIBLE)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb3;


-- -----------------------------------------------------
-- Table `stamariabd`.`nfpendencias`
-- Importação de pendências (módulo Inadimplência). Cada linha representa um
-- título elegível na data da importação, já classificado em fase/status
-- segundo as regras de negócio definidas para o relatório "Base pendencias".
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `stamariabd`.`nfpendencias` (
  `idNfPendencias` INT NOT NULL AUTO_INCREMENT,
  `idImportacao` INT NOT NULL,
  `idCliente` INT NOT NULL,
  `idMatrizCliente` INT NULL DEFAULT NULL,
  `estabelecimento` INT NULL DEFAULT NULL,
  `especie` VARCHAR(10) NOT NULL,
  `serie` VARCHAR(10) NULL DEFAULT NULL,
  `titulo` VARCHAR(20) NULL DEFAULT NULL,
  `parcela` VARCHAR(10) NULL DEFAULT NULL,
  `tipoPedido` VARCHAR(10) NULL DEFAULT NULL,
  `carteira` VARCHAR(10) NULL DEFAULT NULL,
  `dataEmissao` DATE NULL DEFAULT NULL,
  `dataEntrega` DATE NULL DEFAULT NULL,
  `dataVencimento` DATE NOT NULL,
  `valorOriginal` FLOAT(18,2) NULL DEFAULT NULL,
  `saldo` FLOAT(18,2) NULL DEFAULT NULL,
  `dias` INT NULL DEFAULT NULL,
  `cidade` VARCHAR(100) NULL DEFAULT NULL,
  `uf` VARCHAR(2) NULL DEFAULT NULL,
  `fase` VARCHAR(30) NOT NULL,
  `status` VARCHAR(30) NOT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (`idNfPendencias`),
  INDEX `nfImportacao_idx` (`idImportacao` ASC) VISIBLE,
  INDEX `nfCliente_idx` (`idCliente` ASC) VISIBLE,
  INDEX `nfMatrizCliente_idx` (`idMatrizCliente` ASC) VISIBLE,
  INDEX `nfTitulo_idx` (`titulo` ASC) VISIBLE,
  INDEX `nfDataVencimento_idx` (`dataVencimento` ASC) VISIBLE,
  INDEX `nfFase_idx` (`fase` ASC) VISIBLE,
  INDEX `nfStatus_idx` (`status` ASC) VISIBLE,
  CONSTRAINT `nfImportacao`
    FOREIGN KEY (`idImportacao`)
    REFERENCES `stamariabd`.`importacoes` (`idImportacoes`)
    ON DELETE CASCADE,
  CONSTRAINT `nfCliente`
    FOREIGN KEY (`idCliente`)
    REFERENCES `stamariabd`.`clientes` (`idCliente`),
  CONSTRAINT `nfMatrizCliente`
    FOREIGN KEY (`idMatrizCliente`)
    REFERENCES `stamariabd`.`matrizCliente` (`idMatrizCliente`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb3;


SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;
