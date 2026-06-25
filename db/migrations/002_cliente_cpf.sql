-- Suporte a cliente identificado por CPF (atendimento de balcão)
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS cpf VARCHAR;
ALTER TABLE usuarios ALTER COLUMN matricula DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS usuarios_cpf_uniq ON usuarios (cpf) WHERE cpf IS NOT NULL;
