import { Controller, Get, Post, Body, UseGuards, Delete, Param, Request, Patch, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { UsuarioService } from './usuario.service';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { JwtAuthGuard } from 'src/auth/auth.guard';

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
    return this.usuarioService.listarUsuariosComChamados();
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async toggleStatus(@Param('id') id: string) {
    return this.usuarioService.toggleStatus(id);
  }

   @Get('me')
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@Request() req) {
    return this.usuarioService.encontrarPorEmail(req.user.email);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async updateUser(
    @Param('id') id: string,
    @Body() body: { nome?: string; email?: string; telefone?: string; bio?: string },
    @Request() req
  ) {
    // Se não for admin, só pode editar o próprio perfil
    if (req.user.papel !== 'admin' && req.user.id !== id) {
      throw new UnauthorizedException('Você só pode editar seu próprio perfil');
    }
    return this.usuarioService.atualizarUsuario(id, body);
  }

  @Patch(':id/senha')
  @UseGuards(JwtAuthGuard)
  async alterarSenha(
    @Param('id') id: string,
    @Body() body: { senhaAtual: string; novaSenha: string },
    @Request() req
  ) {
    // Se não for admin, só pode alterar a própria senha
    if (req.user.papel !== 'admin' && req.user.id !== id) {
      throw new UnauthorizedException('Você só pode alterar sua própria senha');
    }
    
    return this.usuarioService.alterarSenha(id, body.senhaAtual, body.novaSenha);
  }

  @Patch(':id/senha-admin')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async alterarSenhaAdmin(
    @Param('id') id: string,
    @Body() body: { novaSenha: string }
  ) {
    return this.usuarioService.alterarSenhaAdmin(id, body.novaSenha);
  }

  @Get(':id') // <-- Novo endpoint
  @UseGuards(JwtAuthGuard)
  async getUserById(@Param('id') id: string) {
    const usuario = await this.usuarioService.encontrarPorId(id);
    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return usuario;
  }
}