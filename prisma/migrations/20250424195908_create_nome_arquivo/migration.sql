-- CreateTable
CREATE TABLE "NomeArquivo" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,

    CONSTRAINT "NomeArquivo_pkey" PRIMARY KEY ("id")
);
