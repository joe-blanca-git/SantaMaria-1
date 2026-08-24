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
-- Table structure for table `importacoes`
--

DROP TABLE IF EXISTS `importacoes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `importacoes` (
  `idImportacoes` int NOT NULL AUTO_INCREMENT,
  `nomeArquivo` varchar(200) NOT NULL,
  `extensaoArquivo` varchar(10) NOT NULL,
  `idEmpresa` int DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAte` datetime DEFAULT NULL,
  `tipo` varchar(45) NOT NULL,
  PRIMARY KEY (`idImportacoes`),
  KEY `importEmpresa_idx` (`idEmpresa`),
  CONSTRAINT `importEmpresa` FOREIGN KEY (`idEmpresa`) REFERENCES `empresas` (`idEmpresas`)
) ENGINE=InnoDB AUTO_INCREMENT=112 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `importacoes`
--

LOCK TABLES `importacoes` WRITE;
/*!40000 ALTER TABLE `importacoes` DISABLE KEYS */;
INSERT INTO `importacoes` VALUES (2,'RELAÇÃO FUNCIONÁRIOS .xlsx','xlsx',NULL,'2026-08-13 22:32:08',NULL,'COLABORADORES'),(3,'RELAÇÃO FUNCIONÁRIOS .xlsx','xlsx',NULL,'2026-08-13 22:32:30',NULL,'COLABORADORES'),(4,'RELAÇÃO FUNCIONÁRIOS .xlsx','xlsx',NULL,'2026-08-13 22:45:51',NULL,'COLABORADORES'),(5,'RELAÇÃO FUNCIONÁRIOS .xlsx','xlsx',NULL,'2026-08-13 22:46:55',NULL,'COLABORADORES'),(6,'RELAÇÃO FUNCIONÁRIOS .xlsx','xlsx',NULL,'2026-08-13 22:48:59',NULL,'COLABORADORES'),(17,'05.08.26_Eduan Neves.pdf','pdf',1,'2026-08-19 09:00:45',NULL,'IA_DESPESAS'),(18,'05.08.26_Janilson Santos.pdf','pdf',1,'2026-08-19 09:01:56',NULL,'IA_DESPESAS'),(19,'05.08.26_Alex Faria de Souza (1).pdf','pdf',1,'2026-08-19 09:04:09',NULL,'IA_DESPESAS'),(20,'05.08.26_Tiago Leal.pdf','pdf',1,'2026-08-19 09:05:12',NULL,'IA_DESPESAS'),(21,'05.08.26_Eduardo Aureliano Lima.pdf','pdf',1,'2026-08-19 09:06:37',NULL,'IA_DESPESAS'),(23,'05.08.26_Wender Sousa.pdf','pdf',1,'2026-08-19 09:07:28',NULL,'IA_DESPESAS'),(26,'05.08.26_Marcelo Silva.pdf','pdf',1,'2026-08-19 09:21:37',NULL,'IA_DESPESAS'),(27,'10.08.26_Andre da Silva Moreira (1).pdf','pdf',1,'2026-08-19 09:23:49',NULL,'IA_DESPESAS'),(29,'10.08.26_Eduardo Milanez.pdf','pdf',1,'2026-08-19 09:25:45',NULL,'IA_DESPESAS'),(30,'10.08.26_Fabio Silva Rocha.pdf','pdf',1,'2026-08-19 09:33:48',NULL,'IA_DESPESAS'),(32,'10.08.26_Jeferson Oliveira (1).pdf','pdf',1,'2026-08-19 09:36:56',NULL,'IA_DESPESAS'),(33,'10.08.26_Jose Eduardo Carvalho (1).pdf','pdf',1,'2026-08-19 09:38:38',NULL,'IA_DESPESAS'),(34,'10.08.26_Josivando Nascimento (1).pdf','pdf',1,'2026-08-19 09:39:55',NULL,'IA_DESPESAS'),(35,'10.08.26_Leandro Silva Borges (1).pdf','pdf',1,'2026-08-19 09:40:58',NULL,'IA_DESPESAS'),(37,'10.08.26_Lenadro Melo.pdf','pdf',1,'2026-08-19 09:44:03',NULL,'IA_DESPESAS'),(39,'10.08.26_Luis Porto.pdf','pdf',1,'2026-08-19 09:45:33',NULL,'IA_DESPESAS'),(41,'10.08.26_Luiz Fernando Silva Jr.pdf','pdf',1,'2026-08-19 09:47:26',NULL,'IA_DESPESAS'),(42,'10.08.26_Nikolas Fernandes.pdf','pdf',1,'2026-08-19 09:48:54',NULL,'IA_DESPESAS'),(43,'10.08.26_Theodolindo Junior.pdf','pdf',1,'2026-08-19 09:50:52',NULL,'IA_DESPESAS'),(46,'10.08.26_Wender Sousa.pdf','pdf',1,'2026-08-19 09:52:19',NULL,'IA_DESPESAS'),(48,'LOCALIZA FLEET (1).pdf','pdf',5,'2026-08-19 09:57:17',NULL,'IA_DESPESAS'),(49,'documentosFatura (2).pdf','pdf',5,'2026-08-19 10:05:11',NULL,'IA_DESPESAS'),(53,'17.08.26_Marcelo Silva.pdf','pdf',1,'2026-08-19 11:41:05',NULL,'IA_DESPESAS'),(54,'20.08.26_NEMIAS LUIZ DA SILVA.pdf','pdf',1,'2026-08-19 13:21:12',NULL,'IA_DESPESAS'),(55,'20.08.26_ALEX FARIA DE SOUZA.pdf','pdf',1,'2026-08-19 13:21:56',NULL,'IA_DESPESAS'),(56,'20.08.26_JANILSON SANTOS.pdf','pdf',1,'2026-08-19 13:22:51',NULL,'IA_DESPESAS'),(58,'20.08.26_Eduan Neves.pdf','pdf',1,'2026-08-19 13:24:43',NULL,'IA_DESPESAS'),(59,'20.08.26_EDUARDO LIMA.pdf','pdf',1,'2026-08-19 13:27:30',NULL,'IA_DESPESAS'),(60,'20.08.26_JOELCIO.pdf','pdf',1,'2026-08-19 13:29:55',NULL,'IA_DESPESAS'),(61,'doc25094820260813142827.pdf','pdf',3,'2026-08-19 13:30:13',NULL,'IA_DESPESAS'),(62,'doc25095020260813142918.pdf','pdf',3,'2026-08-19 13:32:39',NULL,'IA_DESPESAS'),(64,'911150.pdf','pdf',6,'2026-08-19 13:38:55',NULL,'IA_DESPESAS'),(66,'Fatura98578 tastur.pdf','pdf',4,'2026-08-20 09:32:27',NULL,'IA_DESPESAS'),(67,'Fabiana de Branco - RDV0000016 - Ana Luíza.pdf','pdf',3,'2026-08-20 09:43:21',NULL,'IA_DESPESAS'),(70,'Flávio Pontes Cruz Macedo - RDV0000008 -  Ana Luíza.pdf','pdf',3,'2026-08-20 09:57:11',NULL,'IA_DESPESAS'),(71,'Fatura98698 tastur.pdf','pdf',4,'2026-08-20 09:58:40',NULL,'IA_DESPESAS'),(72,'RDV JOSE DIRCEU1.pdf','pdf',3,'2026-08-20 09:59:58',NULL,'IA_DESPESAS'),(73,'Fatura#521375_2026_08_01 (3).pdf','pdf',1,'2026-08-20 10:03:59',NULL,'IA_DESPESAS'),(79,'Fatura#526547_2026_08_11 (1).pdf','pdf',1,'2026-08-20 10:24:31',NULL,'IA_DESPESAS'),(81,'Gabriel Rodrigues de Brito - RDV0000004 - Ana Luíza.pdf','pdf',3,'2026-08-21 20:43:56',NULL,'IA_DESPESAS'),(84,'texto1 - 2026-08-17T083226.887_conciliado.xlsx','xlsx',NULL,'2026-08-22 10:41:25',NULL,'Prorrogação - Atacadão'),(95,'com posicao assai_extraido.xlsx','xlsx',NULL,'2026-08-22 12:00:52',NULL,'Composição - Sendas'),(96,'Titulos à Pagar Não Quitados (15)_conciliado.xlsx','xlsx',NULL,'2026-08-22 15:49:35',NULL,'Prorrogação - Savegnago'),(97,'pagamentos_CEMA (14)_extraido.xlsx','xlsx',NULL,'2026-08-22 16:17:29',NULL,'Prorrogação - Cema'),(98,'pagamentos_CEMA (14)_extraido.xlsx','xlsx',NULL,'2026-08-22 16:22:08',NULL,'Prorrogação - Cema'),(99,'pagamentos_CEMA (14)_extraido.xlsx','xlsx',NULL,'2026-08-22 16:27:29',NULL,'Prorrogação - Cema'),(100,'savegnadao prorrogaçaõ_conciliado.xlsx','xlsx',NULL,'2026-08-22 16:40:22',NULL,'Prorrogação - Savegnago'),(101,'Mateus_conciliado.xlsx','xlsx',NULL,'2026-08-22 16:52:43',NULL,'Prorrogação - Mateus'),(102,'raia_conciliado.xlsx','xlsx',NULL,'2026-08-22 18:36:42',NULL,'Prorrogação - Droga Raia'),(103,'raia_conciliado.xlsx','xlsx',NULL,'2026-08-22 18:38:53',NULL,'Prorrogação - Droga Raia'),(104,'raia_conciliado.xlsx','xlsx',NULL,'2026-08-22 18:40:21',NULL,'Prorrogação - Droga Raia'),(106,'sorriso (2).pdf','pdf',21,'2026-08-23 15:27:12',NULL,'PLANO_SAUDE'),(107,'sendas 21.08_extraido.xlsx','xlsx',NULL,'2026-08-24 07:58:27',NULL,'Composição - Sendas'),(108,'texto1 - 2026-08-24T082216.436_conciliado.xlsx','xlsx',NULL,'2026-08-24 08:23:24',NULL,'Prorrogação - Atacadão'),(109,'texto1 - 2026-08-24T082157.476_conciliado.xlsx','xlsx',NULL,'2026-08-24 08:25:02',NULL,'Prorrogação - Atacadão'),(110,'texto1 - 2026-08-24T082211.666_conciliado.xlsx','xlsx',NULL,'2026-08-24 08:25:46',NULL,'Prorrogação - Atacadão'),(111,'texto1 - 2026-08-24T082148.298_conciliado.xlsx','xlsx',NULL,'2026-08-24 08:26:48',NULL,'Prorrogação - Atacadão');
/*!40000 ALTER TABLE `importacoes` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-08-24 18:57:43
