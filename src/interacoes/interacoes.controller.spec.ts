import { Test, TestingModule } from '@nestjs/testing';
import { InteracoesController } from './interacoes.controller';

describe('InteracoesController', () => {
  let controller: InteracoesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InteracoesController],
    }).compile();

    controller = module.get<InteracoesController>(InteracoesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
