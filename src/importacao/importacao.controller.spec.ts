import { Test, TestingModule } from '@nestjs/testing';
import { ImportacaoController } from './importacao.controller';

describe('ImportacaoController', () => {
  let controller: ImportacaoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ImportacaoController],
    }).compile();

    controller = module.get<ImportacaoController>(ImportacaoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
