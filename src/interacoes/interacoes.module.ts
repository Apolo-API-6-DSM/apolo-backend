import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InteracoesService } from './interacoes.service';
import { Interacoes, InteracoesSchema } from './interacoes.schema';
import { InteracoesAlternativas, InteracoesAlternativasSchema } from './interacoes-alternativas.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Interacoes.name, schema: InteracoesSchema },
      { name: InteracoesAlternativas.name, schema: InteracoesAlternativasSchema },
    ]),
  ],
  providers: [InteracoesService],
  exports: [InteracoesService],
})
export class InteracoesModule {}
