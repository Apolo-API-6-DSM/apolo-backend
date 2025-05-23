from flask import Flask, request, jsonify
import pandas as pd
import os
from werkzeug.utils import secure_filename
import uuid

app = Flask(__name__)

# Configurações
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'csv'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Verifica se a pasta de upload existe, se não, cria
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

class ImportacaoService:
    def __init__(self):
        pass

    def importar_arquivo(self, file_path):
        try:
            # Lê o arquivo CSV mantendo todas as colunas originais
            df = pd.read_csv(file_path, encoding='utf-8', sep=',', dtype=str)

            # Filtra e processa as colunas de comentários
            comentarios_cols = [col for col in df.columns if col.startswith('Comentar')]
            
            # Consolida os comentários em uma única coluna
            if comentarios_cols:
                df['comentarios'] = df.apply(lambda row: self._formatar_comentarios(row, comentarios_cols), axis=1)
                df = df.drop(columns=comentarios_cols)
            else:
                df['comentarios'] = 'Sem comentários'

            # Renomeia as colunas principais para padronização
            df = df.rename(columns={
                'Resumo': 'titulo',
                'ID da item': 'id_importado',
                'Status': 'status',
                'Criado': 'data_abertura',
                'Categoria do status alterada': 'ultima_atualizacao',
                'Responsável': 'responsavel',
                'Descrição': 'mensagem'
            })

            # Seleciona e reordena as colunas principais
            colunas_principais = ['titulo', 'id_importado', 'status', 'data_abertura',
                                'ultima_atualizacao', 'responsavel', 'mensagem', 'comentarios']

            df_final = df[colunas_principais]

            # Gera um nome único para o arquivo de saída
            output_file = os.path.join(app.config['UPLOAD_FOLDER'], f'chamados_completos_{uuid.uuid4().hex}.csv')
            df_final.to_csv(output_file, index=False, encoding='utf-8-sig', sep=';')
            
            return {'success': True, 'message': 'Arquivo processado com sucesso', 'file': output_file}
        
        except Exception as e:
            return {'success': False, 'message': f'Erro ao processar arquivo: {str(e)}'}

    def _formatar_comentarios(self, row, comentarios_cols):
        """Formata os comentários em uma string única com quebras de linha"""
        comentarios_formatados = []
        for col in comentarios_cols:
            if pd.notna(row[col]) and str(row[col]).strip() != '':
                comentarios_formatados.append(f"{col}: \"{str(row[col]).strip()}\"")
        
        return '\n\n'.join(comentarios_formatados) if comentarios_formatados else 'Sem comentários'

class ConsolidacaoService:
    def __init__(self):
        pass

    def consolidar_comentarios(self, input_file):
        try:
            # Lê o arquivo gerado anteriormente
            df = pd.read_csv(input_file, encoding='utf-8-sig', sep=';')

            # Identifica colunas de comentários
            comentarios_cols = [col for col in df.columns if col.startswith('Comentar')]

            # Função para consolidar os comentários
            def consolidar(row):
                comentarios = []
                for col in comentarios_cols:
                    if pd.notna(row[col]) and str(row[col]).strip() != '':
                        comentarios.append(f"{col}: {str(row[col]).strip()}")
                return '\n'.join(comentarios) if comentarios else 'Sem comentários'

            # Aplica a consolidação
            df['comentarios'] = df.apply(consolidar, axis=1)
            df['quantidade_comentarios'] = df[comentarios_cols].notna().sum(axis=1)

            # Remove as colunas individuais de comentários
            df = df.drop(columns=comentarios_cols)

            # Reordena as colunas
            colunas_ordenadas = ['titulo', 'id_importado', 'status', 'data_abertura',
                               'ultima_atualizacao', 'responsavel', 'mensagem',
                               'quantidade_comentarios', 'comentarios']
            df = df[colunas_ordenadas]

            # Gera um nome único para o arquivo de saída
            output_file = os.path.join(app.config['UPLOAD_FOLDER'], f'chamados_consolidados_{uuid.uuid4().hex}.csv')
            df.to_csv(output_file, index=False, encoding='utf-8-sig', sep=';')
            
            return {'success': True, 'message': 'Comentários consolidados com sucesso', 'file': output_file}
        
        except Exception as e:
            return {'success': False, 'message': f'Erro ao consolidar comentários: {str(e)}'}

@app.route('/importar', methods=['POST'])
def importar():
    if 'file' not in request.files:
        return jsonify({'success': False, 'message': 'Nenhum arquivo enviado'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'success': False, 'message': 'Nenhum arquivo selecionado'}), 400
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        temp_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(temp_path)
        
        service = ImportacaoService()
        result = service.importar_arquivo(temp_path)
        
        # Remove o arquivo temporário
        os.remove(temp_path)
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 500
    
    return jsonify({'success': False, 'message': 'Tipo de arquivo não permitido'}), 400

@app.route('/consolidar', methods=['POST'])
def consolidar():
    if 'file' not in request.files:
        return jsonify({'success': False, 'message': 'Nenhum arquivo enviado'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'success': False, 'message': 'Nenhum arquivo selecionado'}), 400
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        temp_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(temp_path)
        
        service = ConsolidacaoService()
        result = service.consolidar_comentarios(temp_path)
        
        # Remove o arquivo temporário
        os.remove(temp_path)
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 500
    
    return jsonify({'success': False, 'message': 'Tipo de arquivo não permitido'}), 400

@app.route('/processar', methods=['POST'])
def processar():
    if 'file' not in request.files:
        return jsonify({'success': False, 'message': 'Nenhum arquivo enviado'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'success': False, 'message': 'Nenhum arquivo selecionado'}), 400
    
    if not (file.filename.lower().endswith('.csv') or '.' not in file.filename):
        return jsonify({'success': False, 'message': 'Apenas arquivos CSV são permitidos'}), 400
    
    try:
        unique_filename = f"temp_{uuid.uuid4().hex}.csv"
        temp_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        file.save(temp_path)
        
        service = ImportacaoService()
        result = service.importar_arquivo(temp_path)
        
        os.remove(temp_path)
        
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'success': False, 'message': f'Erro ao processar arquivo: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8002, debug=True)