-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "papel" TEXT NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chamado" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "responsavel" TEXT NOT NULL,
    "id_importado" TEXT NOT NULL,
    "ultima_atualizacao" TIMESTAMP(3) NOT NULL,
    "tipo_importacao" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "data_abertura" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Chamado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Chamado_id_importado_key" ON "Chamado"("id_importado");
