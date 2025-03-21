import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ImportacaoController } from './importacao.controller';
import { ImportacaoService } from './importacao.service';
import { PrismaModule } from '../prisma/prisma.module';
import { InteracoesModule } from '../interacoes/interacoes.module';

@Module({
  imports: [
    MulterModule.register({ dest: './uploads' }), 
    PrismaModule, 
    InteracoesModule
  ],
  controllers: [ImportacaoController],
  providers: [ImportacaoService],
})
export class ImportacaoModule {}
