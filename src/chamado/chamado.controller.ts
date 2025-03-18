import { Controller, Get, Post, Body } from '@nestjs/common';
import { ChamadoService } from './chamado.service';

@Controller('chamados')
export class ChamadoController {
  constructor(private readonly chamadoService: ChamadoService) {}

  @Post()
  criarChamado(@Body() body: any) {
    return this.chamadoService.criarChamado(body);
  }

  @Get()
  listarChamados() {
    return this.chamadoService.listarChamados();
  }
}
