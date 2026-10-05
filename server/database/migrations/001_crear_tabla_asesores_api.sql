-- Migración 001: tabla de asesores
--
-- Estructura que esperan database/queries.js, asesor.model.js y el controlador de carga.
-- Antes de ejecutarla contra una base existente, compárala con la tabla real:
--   EXEC sp_help 'dbo.asesores_api';
-- Si cambias TBL_ASESORES, cambia también el nombre de la tabla aquí.
--
-- Ejecución (ver docs/06-base-de-datos.md):
--   sqlcmd -S <servidor> -U <usuario> -P <contraseña> -d <base> -C -i server/database/migrations/001_crear_tabla_asesores_api.sql

IF OBJECT_ID(N'dbo.asesores_api', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.asesores_api (
        id               INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_asesores_api PRIMARY KEY,
        id_asesor        VARCHAR(255)  NOT NULL,
        nombre_asesor    VARCHAR(255)  NOT NULL,
        equipo_entidad   VARCHAR(255)  NOT NULL,
        compania         VARCHAR(255)  NOT NULL,
        correo_contacto  VARCHAR(255)  NULL,
        celular_contacto VARCHAR(20)   NULL,
        rol_asesor       VARCHAR(255)  NULL,
        observaciones    VARCHAR(MAX)  NULL,
        fecha_novedad    DATETIME      NULL,
        usuario          VARCHAR(255)  NOT NULL
    );
END;
