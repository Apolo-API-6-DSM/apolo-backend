import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InteracoesService } from './interacoes.service';
import { InteracoesController } from './interacoes.controller';
import { Interacoes, InteracoesSchema } from './interacoes.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Interacoes.name, schema: InteracoesSchema }])],
  controllers: [InteracoesController],
  providers: [InteracoesService],
  exports: [InteracoesService],
})
export class InteracoesModule {}
