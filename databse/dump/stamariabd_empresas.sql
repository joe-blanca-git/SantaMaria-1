-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: stamariabd
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `empresas`
--

DROP TABLE IF EXISTS `empresas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `empresas` (
  `idEmpresas` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(80) NOT NULL,
  `descricao` varchar(200) DEFAULT NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAte` datetime DEFAULT NULL,
  PRIMARY KEY (`idEmpresas`)
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `empresas`
--

LOCK TABLES `empresas` WRITE;
/*!40000 ALTER TABLE `empresas` DISABLE KEYS */;
INSERT INTO `empresas` VALUES (1,'OnFly','Empresa de registro de empresas variadas.','2026-08-13 23:05:06',NULL),(2,'Kinto','Empresa de aluguel de carros.','2026-08-13 23:05:33',NULL),(3,'RDV - SANTA MARIA','Gastos em geral de despesa de viagem','2026-08-14 21:08:36',NULL),(4,'TASTUR','Empresa de alguel de carros e viagens','2026-08-14 21:15:15',NULL),(5,'Localiza','Empresa de aluguel de carros.','2026-08-18 17:03:32','2026-08-18 17:03:48'),(6,'Maiorca','Empresa de aluguel de carros.','2026-08-19 13:34:39','2026-08-19 13:34:47'),(7,'Cartão Corporativo Banco do Brasil','Gastos em geral de despesa de viagem','2026-08-19 13:41:50','2026-08-19 13:47:04'),(8,'Cartão corporativo Banco Santander','Gastos em geral de despesa de viagem','2026-08-19 13:46:54',NULL),(18,'Sorriso','Plano odontológico','2026-08-23 15:06:23',NULL),(19,'Sorriso','Plano odontológico','2026-08-23 15:06:24',NULL),(20,'Sorriso','Plano odontológico','2026-08-23 15:08:03',NULL),(21,'Sorriso','Plano odontológico','2026-08-23 15:08:42',NULL),(22,'Unimed - Seguro Saúde','Seguro saúde','2026-08-23 15:45:19','2026-08-23 15:45:47'),(23,'Unimed - Seguro de Vida','Seguro de vida','2026-08-23 15:45:36','2026-08-23 15:45:51');
/*!40000 ALTER TABLE `empresas` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-08-24 18:57:44
