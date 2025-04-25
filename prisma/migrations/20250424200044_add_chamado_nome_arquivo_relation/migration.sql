-- AlterTable
ALTER TABLE "Chamado" ADD COLUMN     "nomeArquivoId" INTEGER;

-- AddForeignKey
ALTER TABLE "Chamado" ADD CONSTRAINT "Chamado_nomeArquivoId_fkey" FOREIGN KEY ("nomeArquivoId") REFERENCES "NomeArquivo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
