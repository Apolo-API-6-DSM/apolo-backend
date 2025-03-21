import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type InteracoesDocument = Interacoes & Document;

@Schema({ collection: 'interacoes' })
export class Interacoes {
  @Prop({ required: true })
  chamadoId: string;

  @Prop({ required: true })
  mensagem: string;

  @Prop({ required: true })
  origem: string;

  @Prop()
  usuario?: string;
}

export const InteracoesSchema = SchemaFactory.createForClass(Interacoes);
