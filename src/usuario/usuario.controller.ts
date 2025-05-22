import { Controller, Get, Post, Body, UseGuards, Delete, Param } from '@nestjs/common';
import { UsuarioService } from './usuario.service';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('usuarios')
export class UsuarioController {
  constructor(private readonly usuarioService: UsuarioService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  criarUsuario(@Body() body: { email: string; senha: string; papel: string, nome: string }) {
    return this.usuarioService.criarUsuario(body.email, body.senha, body.papel, body.nome);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('admin')
  listarUsuarios() {
    return this.usuarioService.listarUsuarios();
  }

  @Delete(':id/desativar')
  @UseGuards(RolesGuard)
  @Roles('admin')
  desativarUsuario(@Param('id') id: string) {
    return this.usuarioService.desativarUsuario(id);
  }
}