import { Controller, Post, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImportacaoService } from './importacao.service';
import { Express } from 'express';

@Controller('importacao')
export class ImportacaoController {
  constructor(private readonly importacaoService: ImportacaoService) {}

  @Post('jira')
  @UseInterceptors(FileInterceptor('file'))
  async importarJira(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Arquivo não enviado');
    }

    const filePath = file.path;
    await this.importacaoService.importarArquivo(filePath);
    return { message: 'Arquivo importado com sucesso!' };
  }
}