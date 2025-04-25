import { Controller, Post, UploadedFile, UseInterceptors, BadRequestException, Body } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImportacaoService } from './importacao.service';
import { Express } from 'express';

@Controller('importacao')
export class ImportacaoController {
  constructor(private readonly importacaoService: ImportacaoService) {}

  @Post('jira')
  @UseInterceptors(FileInterceptor('file'))
  async importarJira(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { fileName: string }  )
    {
    if (!file) {
      throw new BadRequestException('Arquivo não enviado');
    }

    const filePath = file.path;
    await this.importacaoService.importarArquivo(filePath, body.fileName);
    return { message: 'Arquivo importado com sucesso!' };
  }
}