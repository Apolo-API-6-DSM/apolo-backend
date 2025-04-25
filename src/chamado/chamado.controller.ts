import { Controller, Get, Post, Body, Query, ParseIntPipe, Param, Logger, NotFoundException } from '@nestjs/common';
import { ChamadoService } from './chamado.service';
import { Chamado } from '@prisma/client';

@Controller('chamados')
export class ChamadoController {
  constructor(private readonly chamadoService: ChamadoService) {}
  private readonly logger = new Logger(ChamadoController.name);

  @Post()
  criarChamado(@Body() body: any) {
    return this.chamadoService.criarChamado(body);
  }

  @Get()
  listarChamados() {
    return this.chamadoService.listarChamados();
  }

  @Get('paginacao')
  async listarChamadosPaginados(
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 100
  ): Promise<Chamado[]> {
    return this.chamadoService.listarChamadosPaginados(page, limit);
  }

  @Get('status')
  async listarPorStatus(@Query('status') status: string): Promise<Chamado[]> {
    return this.chamadoService.listarPorStatus(status);
  }

  @Get('sentimento')
  async listarPorSentimento(@Query('sentimento') sentimento: string): Promise<Chamado[]> {
    return this.chamadoService.listarPorSentimento(sentimento);
  }

  @Get('tipo-importacao')
  async listarPorTipoImportacao(
    @Query('tipo_importacao') tipo_importacao: string
  ): Promise<Chamado[]> {
    return this.chamadoService.listarPorTipoImportacao(tipo_importacao);
  }

  @Post('atualizar-emocoes')
  async atualizarEmocoes(
    @Body('chamados') chamados: any[],
    @Body('nomeArquivoId') nomeArquivoId: number
  ): Promise<{ message: string }> {
    await this.chamadoService.atualizarEmocoes(chamados, nomeArquivoId);
    return { message: 'Emoções atualizadas com sucesso!' };
  }


  @Get('/:id')
  async buscarChamadoPorId(@Param('id') id: string) {
    try {
      this.logger.log(`Buscando chamado com ID: ${id}`);

      const chamado = await this.chamadoService.buscarChamadoPorId(id);

      if (!chamado) {
        throw new NotFoundException(`Chamado com ID ${id} não encontrado.`);
      }

      return {
        status: 'success',
        chamado,
      };
    } catch (error) {
      this.logger.error(`Erro ao buscar chamado ${id}: ${error.message}`);
      throw error;
    }
  }
}
