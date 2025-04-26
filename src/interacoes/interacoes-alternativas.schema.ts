import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type InteracoesAlternativasDocument = InteracoesAlternativas & Document;

@Schema({ collection: 'interacoes_alternativas' })
export class InteracoesAlternativas {
  @Prop({ required: true })
  chamadoId: string;

  @Prop()
  descricao: string;

  @Prop()
  solucao: string;

  @Prop({ required: true })
  origem: string;

  @Prop()
  usuario?: string;

  @Prop({ default: Date.now })
  data?: Date;
}

export const InteracoesAlternativasSchema = SchemaFactory.createForClass(InteracoesAlternativas);
