import { Test, TestingModule } from '@nestjs/testing';
import { ChamadoService } from './chamado.service';

describe('ChamadoService', () => {
  let service: ChamadoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChamadoService],
    }).compile();

    service = module.get<ChamadoService>(ChamadoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
