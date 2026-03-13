#!/bin/bash

# Configurações de cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Variáveis globais
INPUT_FILE=""
OUTPUT_FILE=""
OUTPUT_DIR="."
SHOW_TREE=false
SHOW_FILE=false
SPECIFIC_FILE=""
EXPORT_ALL=false
EXPORT_FILE=false
SHOW_HELP=true
INCLUDE_IMAGES=false

# Verificação de dependências
check_dependencies() {
    local missing_deps=()
    
    if ! command -v tree &> /dev/null; then
        missing_deps+=("tree")
    fi
    if ! command -v file &> /dev/null; then
        missing_deps+=("file")
    fi
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        echo -e "${RED}Erro: Comandos não encontrados: ${missing_deps[*]}${NC}"
        echo "Instale com:"
        echo "  Ubuntu/Debian: sudo apt install ${missing_deps[*]}"
        echo "  macOS: brew install ${missing_deps[*]}"
        exit 1
    fi
}

# Normalização de caminhos (cross-platform)
normalize_path() {
    local path="${1%/}"
    [[ "$path" == /* ]] || path="$PWD/$path"
    echo "$path"
}

# Verificar se arquivo é binário (versão otimizada)
is_binary_file() {
    local file="$1"
    local mime_type
    mime_type=$(file -b --mime-type "$file" 2>/dev/null)
    
    # Lista mais abrangente de tipos texto
    case "$mime_type" in
        text/*|application/json|application/xml|application/javascript|\
        application/x-yaml|application/x-sh|application/x-python|\
        application/x-perl|application/x-ruby|inode/x-empty|\
        application/x-shellscript|application/x-awk)
            return 1 # É texto
            ;;
        *)
            return 0 # É binário
            ;;
    esac
}

# Verificar tamanho do arquivo
check_file_size() {
    local file="$1"
    local max_size=$((10 * 1024 * 1024)) # 10MB
    local file_size
    
    if [ -f "$file" ]; then
        file_size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null)
        if [ "$file_size" -gt "$max_size" ]; then
            echo -e "${YELLOW}⚠ Arquivo muito grande ($(($file_size / 1024 / 1024))MB): $file - Truncando...${NC}"
            return 1
        fi
    fi
    return 0
}

# Exibir ajuda completa com exemplos
show_help() {
    echo -e "${BLUE}=== AJUDA COMPLETA: estrutura-texto.sh ==="
    echo -e "Script para análise e exportação de estruturas de projetos${NC}"
    
    echo -e "\n${YELLOW}📋 MODO DE USO BÁSICO:"
    echo -e "  ${GREEN}./estrutura-texto.sh --output arquivo.txt${NC}        # Gera análise do projeto atual"
    echo -e "  ${GREEN}./estrutura-texto.sh --input projeto.txt${NC}         # Lê análise existente"
    
    echo -e "\n${YELLOW}🔍 OPÇÕES DE VISUALIZAÇÃO:"
    echo -e "  ${GREEN}--tree${NC}                       # Mostrar apenas estrutura em árvore"
    echo -e "  ${GREEN}--file${NC}                       # Mostrar conteúdo de TODOS os arquivos na tela"
    echo -e "  ${GREEN}--file CAMINHO_COMPLETO${NC}      # Mostrar conteúdo de um arquivo específico"
    echo -e "  ${GREEN}--include-images${NC}             # Incluir arquivos de imagem na análise"
    
    echo -e "\n${YELLOW}💾 OPÇÕES DE EXPORTAÇÃO:"
    echo -e "  ${GREEN}--export-all${NC}                 # Exportar projeto completo"
    echo -e "  ${GREEN}--export-file${NC}                # Exportar arquivo específico"
    echo -e "  ${GREEN}--output-dir diretorio${NC}       # Especificar diretório de saída"
    
    echo -e "\n${YELLOW}🛠 EXEMPLOS COMPLETOS:"
    
    echo -e "\n${BLUE}● Análise do projeto atual:"
    echo -e "  ${GREEN}./estrutura-texto.sh --output analise.txt${NC}"
    echo -e "  ${GREEN}./estrutura-texto.sh --output analise.txt --include-images${NC}"
    
    echo -e "\n${BLUE}● Visualização específica:"
    echo -e "  ${GREEN}./estrutura-texto.sh --input analise.txt --tree${NC}                          # Mostra árvore"
    echo -e "  ${GREEN}./estrutura-texto.sh --input analise.txt --file${NC}                          # Mostra todos os arquivos"
    echo -e "  ${GREEN}./estrutura-texto.sh --input analise.txt --file static/js/dashboard.js${NC}   # Arquivo específico (caminho completo)"
    echo -e "  ${GREEN}./estrutura-texto.sh --input analise.txt --file ./config/aws_org_tree.yaml${NC} # Com ./ no início"
    
    echo -e "\n${BLUE}● Exportação completa:"
    echo -e "  ${GREEN}./estrutura-texto.sh --input analise.txt --export-all${NC}"
    echo -e "  ${GREEN}./estrutura-texto.sh --input analise.txt --export-all --output-dir backup${NC}"
    
    echo -e "\n${BLUE}● Exportação de arquivo único:"
    echo -e "  ${GREEN}./estrutura-texto.sh --input analise.txt --export-file${NC}"
    echo -e "  ${GREEN}./estrutura-texto.sh --input analise.txt --export-file --output-dir documentos${NC}"
    
    echo -e "\n${BLUE}● Combinações avançadas:"
    echo -e "  ${GREEN}./estrutura-texto.sh --output analise.txt --include-images --tree${NC}"
    echo -e "  ${GREEN}./estrutura-texto.sh --input analise.txt --export-file --output-dir backup${NC}"
    
    echo -e "\n${YELLOW}⚠ NOTAS IMPORTANTES:"
    echo -e "  - Sempre especifique pelo menos um argumento"
    echo -e "  - Use --help para mostrar esta mensagem"
    echo -e "  - Arquivos binários são automaticamente filtrados"
    echo -e "  - O comando --file sem parâmetro exibe todos os arquivos"
    echo -e "  - O comando --file CAMINHO exibe apenas o arquivo no caminho especificado"
    echo -e "  - SEMPRE use o caminho completo para evitar ambiguidade entre arquivos com mesmo nome"
    echo -e "  - Aceita caminhos com ou sem './' no início"
    echo -e "  - Nomes de arquivos com espaços são tratados adequadamente${NC}"
}

# Processamento de argumentos
process_args() {
    [ $# -eq 0 ] && return

    SHOW_HELP=false
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --input) 
                INPUT_FILE="$2"
                if [ -z "$INPUT_FILE" ]; then
                    echo -e "${RED}Erro: --input requer um arquivo${NC}"
                    exit 1
                fi
                shift 2 
                ;;
            --output) 
                OUTPUT_FILE="$2"
                if [ -z "$OUTPUT_FILE" ]; then
                    echo -e "${RED}Erro: --output requer um arquivo${NC}"
                    exit 1
                fi
                shift 2 
                ;;
            --output-dir) 
                OUTPUT_DIR="$2"
                if [ -z "$OUTPUT_DIR" ]; then
                    echo -e "${RED}Erro: --output-dir requer um diretório${NC}"
                    exit 1
                fi
                shift 2 
                ;;
            --tree) 
                SHOW_TREE=true
                shift 
                ;;
            --file) 
                SHOW_FILE=true
                # Verificar se o próximo argumento é um caminho de arquivo (não começa com --)
                if [[ $# -gt 1 && "$2" != --* ]]; then
                    SPECIFIC_FILE="$2"
                    shift 2
                else
                    shift
                fi
                ;;
            --export-all) EXPORT_ALL=true; shift ;;
            --export-file) EXPORT_FILE=true; shift ;;
            --include-images) INCLUDE_IMAGES=true; shift ;;
            --help|-h) SHOW_HELP=true; shift ;;
            *) 
                echo -e "${RED}Argumento inválido: $1${NC}"
                echo -e "${YELLOW}Use --help para ver os argumentos válidos${NC}"
                exit 1 
                ;;
        esac
    done
}

# Listagem do projeto atual
list_current_project() {
    check_dependencies
    OUTPUT_DIR=$(normalize_path "$OUTPUT_DIR")

    # Verificar permissões de escrita
    if [ -n "$OUTPUT_FILE" ] && ! touch "$OUTPUT_FILE" 2>/dev/null; then
        echo -e "${RED}Erro: Sem permissão para escrever em $OUTPUT_FILE${NC}"
        exit 1
    fi

    local exclude_patterns=(
        -not -path '*/.git/*'
        -not -path '*/node_modules/*'
        -not -path '*/dist/*'
        -not -path '*/build/*'
        -not -path '*/venv/*'
        -not -path '*/__pycache__/*'
        -not -path '*/.DS_Store'
        -not -name "*.DS_Store"
        -not -name "*.pyc"
        -not -name "*.pyo"
        -not -name "*.eot" -not -name "*.ttf" -not -name "*.woff*"
        -not -name "*.zip" -not -name "*.gz" -not -name "*.tar*" -not -name "*.rar"
        -not -name "*.xls*" -not -name "*.pdf" -not -name "*.doc*"
        -not -name "*.so" -not -name "*.o" -not -name "*.dll" -not -name "*.exe"
        -not -name "*.bin" -not -name "*.dat" -not -name "*.dump"
    )

    if [ "$INCLUDE_IMAGES" = false ]; then
        exclude_patterns+=(
            -not -name "*.png" -not -name "*.jpg" -not -name "*.jpeg"
            -not -name "*.gif" -not -name "*.svg" -not -name "*.ico"
            -not -name "*.bmp" -not -name "*.webp" -not -name "*.psd"
            -not -name "*.tiff" -not -name "*.raw"
        )
    fi

    {
        echo "=== ESTRUTURA DO PROJETO ==="
        echo "Gerado em: $(date '+%d/%m/%Y %H:%M:%S')"
        echo "Diretório: $(pwd)"
        echo ""
        
        if command -v tree &> /dev/null; then
            tree -a -I 'node_modules|.git|dist|build|venv|__pycache__|*.pyc|.DS_Store'
        else
            find . -type d "${exclude_patterns[@]}" | sort | sed 's|[^/]*/|  |g'
        fi
        
        echo ""
        echo "=== CONTEÚDO DOS ARQUIVOS ==="
        
        # Processar arquivos um por vez para melhor controle
        find . -type f "${exclude_patterns[@]}" -print0 | while IFS= read -r -d '' file; do
            if ! is_binary_file "$file"; then
                echo ""
                echo "--- ARQUIVO: $file ---"
                if [ -r "$file" ]; then
                    # Verificar tamanho do arquivo
                    if check_file_size "$file"; then
                        cat "$file" 2>/dev/null || echo "[Erro ao ler arquivo]"
                    else
                        # Arquivo muito grande - truncar
                        head -c 51200 "$file" 2>/dev/null || echo "[Erro ao ler arquivo]"
                        echo ""
                        echo "[ARQUIVO TRUNCADO - Tamanho original muito grande]"
                    fi
                else
                    echo "[Sem permissão de leitura]"
                fi
            fi
        done
    } > "$OUTPUT_FILE"
    
    echo -e "${GREEN}✅ Análise gerada com sucesso em: $OUTPUT_FILE${NC}"
}

# Exportação de projetos (VERSÃO CORRIGIDA)
export_project() {
    local action="$1"
    echo -e "${YELLOW}Preparando para exportar projeto...${NC}"
    OUTPUT_DIR=$(normalize_path "$OUTPUT_DIR")
    
    # Verificar se o diretório de saída pode ser criado
    if [ ! -d "$OUTPUT_DIR" ]; then
        if ! mkdir -p "$OUTPUT_DIR" 2>/dev/null; then
            echo -e "${RED}Erro: Não foi possível criar diretório $OUTPUT_DIR${NC}"
            exit 1
        fi
    fi

    # Verificar permissões de escrita
    if [ ! -w "$OUTPUT_DIR" ]; then
        echo -e "${RED}Erro: Sem permissão de escrita em $OUTPUT_DIR${NC}"
        exit 1
    fi

    if [ "$action" = "all" ]; then
        local current_file=""
        local files_created=()
        local in_file_content=false
        local files_processed=0
        
        echo -e "${BLUE}📁 Iniciando exportação de todos os arquivos...${NC}"
        
        while IFS= read -r line; do
            if [[ "$line" =~ ^---\ ARQUIVO:\ (.+)\ ---$ ]]; then
                # Fechar arquivo anterior se existir
                if [ -n "$current_file" ] && [ "$in_file_content" = true ]; then
                    ((files_processed++))
                fi
                
                current_file=""
                in_file_content=false
                
                local file_path="${BASH_REMATCH[1]}"
                # Remover ./ do início se presente
                file_path="${file_path#./}"
                local full_path="$OUTPUT_DIR/$file_path"
                
                if [ -f "$full_path" ]; then
                    echo -e "${YELLOW}⚠ Sobrescrevendo: $full_path${NC}"
                else
                    echo -e "${GREEN}✅ Criando: $full_path${NC}"
                fi
                
                # Criar diretório pai se necessário
                local dir_path
                dir_path=$(dirname "$full_path")
                if ! mkdir -p "$dir_path" 2>/dev/null; then
                    echo -e "${RED}Erro: Não foi possível criar diretório $dir_path${NC}"
                    continue
                fi
                
                # Inicializar arquivo (limpar conteúdo)
                if : > "$full_path" 2>/dev/null; then
                    current_file="$full_path"
                    files_created+=("$full_path")
                    in_file_content=true
                else
                    echo -e "${RED}Erro: Não foi possível criar arquivo $full_path${NC}"
                    current_file=""
                    in_file_content=false
                fi
            elif [ "$in_file_content" = true ] && [ -n "$current_file" ]; then
                # Escrever linha no arquivo atual
                if ! echo "$line" >> "$current_file" 2>/dev/null; then
                    echo -e "${RED}Erro: Falha ao escrever no arquivo $current_file${NC}"
                    in_file_content=false
                    current_file=""
                fi
            fi
        done < "$INPUT_FILE"
        
        # Contar o último arquivo se estava sendo processado
        if [ -n "$current_file" ] && [ "$in_file_content" = true ]; then
            ((files_processed++))
        fi
        
        echo -e "${BLUE}✅ Exportação concluída em: $OUTPUT_DIR${NC}"
        echo -e "${GREEN}Arquivos criados: ${#files_created[@]}${NC}"
        echo -e "${GREEN}Arquivos processados: $files_processed${NC}"
        
        # Verificar se arquivos foram criados com conteúdo
        local empty_files=0
        local total_size=0
        for file in "${files_created[@]}"; do
            if [ ! -s "$file" ]; then
                echo -e "${YELLOW}⚠ Arquivo vazio: $file${NC}"
                ((empty_files++))
            else
                local file_size
                file_size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || echo 0)
                total_size=$((total_size + file_size))
            fi
        done
        
        if [ $empty_files -gt 0 ]; then
            echo -e "${YELLOW}⚠ $empty_files arquivo(s) ficaram vazios${NC}"
        fi
        
        echo -e "${BLUE}📊 Tamanho total exportado: $((total_size / 1024)) KB${NC}"
        
    else
        echo -e "${BLUE}📁 Arquivos disponíveis para exportação:${NC}"
        local available_files
        available_files=$(grep -E '^--- ARQUIVO: ' "$INPUT_FILE" | sed 's/^--- ARQUIVO: \(.*\) ---$/\1/' | sed 's|^\./||')
        
        if [ -z "$available_files" ]; then
            echo -e "${RED}Nenhum arquivo encontrado no arquivo de entrada${NC}"
            exit 1
        fi
        
        echo "$available_files" | nl -w2 -s'. '
        echo ""
        
        read -p "Digite o caminho do arquivo (ou número): " file_input
        
        local file_to_export
        if [[ "$file_input" =~ ^[0-9]+$ ]]; then
            file_to_export=$(echo "$available_files" | sed -n "${file_input}p")
            if [ -z "$file_to_export" ]; then
                echo -e "${RED}Número inválido!${NC}"
                exit 1
            fi
        else
            file_to_export="$file_input"
        fi
        
        # Verificar se o arquivo existe no arquivo de entrada
        if ! grep -q "^--- ARQUIVO: .*$file_to_export ---$" "$INPUT_FILE" && \
           ! grep -q "^--- ARQUIVO: \./$file_to_export ---$" "$INPUT_FILE"; then
            echo -e "${RED}Arquivo '$file_to_export' não encontrado!${NC}"
            exit 1
        fi

        local output_path="$OUTPUT_DIR/$(basename "$file_to_export")"
        
        if [ -f "$output_path" ]; then
            read -p "Arquivo '$output_path' já existe. Sobrescrever? (s/N): " confirm
            if [[ ! "$confirm" =~ ^[Ss]$ ]]; then
                echo -e "${YELLOW}Operação cancelada.${NC}"
                exit 0
            fi
        fi

        # Extrair conteúdo do arquivo (VERSÃO CORRIGIDA)
        local pattern1="^--- ARQUIVO: $file_to_export ---$"
        local pattern2="^--- ARQUIVO: \./$file_to_export ---$"
        
        # Usar awk mais robusto para extração
        {
            awk -v start_pat="$pattern1" '
                $0 ~ start_pat { found=1; next }
                found && /^--- ARQUIVO:/ { exit }
                found { print }
            ' "$INPUT_FILE" 2>/dev/null
            
            # Se não encontrou com pattern1, tentar pattern2
            if [ ! -s "$output_path" ]; then
                awk -v start_pat="$pattern2" '
                    $0 ~ start_pat { found=1; next }
                    found && /^--- ARQUIVO:/ { exit }
                    found { print }
                ' "$INPUT_FILE" 2>/dev/null
            fi
        } > "$output_path"
        
        if [ -s "$output_path" ]; then
            local file_size
            file_size=$(stat -f%z "$output_path" 2>/dev/null || stat -c%s "$output_path" 2>/dev/null || echo 0)
            echo -e "${GREEN}✅ Arquivo exportado com sucesso: $output_path${NC}"
            echo -e "${BLUE}📊 Tamanho: $((file_size / 1024)) KB${NC}"
        else
            echo -e "${RED}Erro ao exportar arquivo ou arquivo vazio${NC}"
            exit 1
        fi
    fi
}

# Mostrar estrutura em árvore
show_tree_structure() {
    # Encontrar a linha onde termina a seção de estrutura
    local line_num
    line_num=$(grep -n "=== CONTEÚDO DOS ARQUIVOS ===" "$INPUT_FILE" | head -1 | cut -d: -f1)
    
    if [ -n "$line_num" ]; then
        # Mostrar da linha 1 até a linha antes de CONTEÚDO
        head -n $((line_num - 1)) "$INPUT_FILE"
    else
        # Se não encontrar CONTEÚDO, mostrar as primeiras 100 linhas
        head -100 "$INPUT_FILE"
    fi
}

# Mostrar conteúdo dos arquivos na tela (VERSÃO MELHORADA)
show_file_content() {
    if [ -n "$SPECIFIC_FILE" ]; then
        # Normalizar o caminho de entrada (remover ./ se presente)
        local normalized_input="${SPECIFIC_FILE#./}"
        
        echo -e "${BLUE}=== CONTEÚDO DO ARQUIVO: $normalized_input ===${NC}"
        
        # Buscar tanto com ./ quanto sem ./
        local found_line
        found_line=$(grep -n "^--- ARQUIVO: \(\./\)\?${normalized_input} ---$" "$INPUT_FILE" | head -1 | cut -d: -f1)
        
        if [ -n "$found_line" ]; then
            echo -e "${GREEN}✅ Arquivo encontrado: $normalized_input${NC}"
            echo ""
            # Usar awk para extrair o conteúdo entre os delimitadores
            awk -v start_line="$found_line" '
                NR == start_line { found=1; next }
                found && /^--- ARQUIVO:/ { exit }
                found { print }
            ' "$INPUT_FILE"
        else
            echo -e "${RED}❌ Arquivo '$normalized_input' não encontrado!${NC}"
            echo -e "${YELLOW}💡 Certifique-se de usar o caminho completo exato.${NC}"
            echo -e "${YELLOW}📁 Arquivos disponíveis (primeiros 20):${NC}"
            grep -E '^--- ARQUIVO: ' "$INPUT_FILE" | sed 's/^--- ARQUIVO: \(.*\) ---$/  \1/' | head -20
            
            local total_files
            total_files=$(grep -c '^--- ARQUIVO: ' "$INPUT_FILE")
            if [ "$total_files" -gt 20 ]; then
                echo -e "${YELLOW}   ... e mais $((total_files - 20)) arquivos${NC}"
                echo -e "${YELLOW}💡 Use: ./estrutura-texto.sh --input $INPUT_FILE --file para ver todos${NC}"
            fi
        fi
    else
        # Mostrar todos os arquivos (comportamento original)
        local line_num
        line_num=$(grep -n "=== CONTEÚDO DOS ARQUIVOS ===" "$INPUT_FILE" | head -1 | cut -d: -f1)
        
        if [ -n "$line_num" ]; then
            # Mostrar da linha CONTEÚDO até o final
            tail -n +$line_num "$INPUT_FILE"
        else
            # Se não encontrar CONTEÚDO, mostrar linhas com ARQUIVO
            grep -A 999999 "--- ARQUIVO:" "$INPUT_FILE"
        fi
    fi
}

# Fluxo principal
main() {
    process_args "$@"

    if [ "$SHOW_HELP" = true ]; then
        show_help
        exit 0
    fi

    # Verificar se pelo menos uma operação foi especificada
    if [ $# -eq 0 ]; then
        echo -e "${RED}❌ Erro: É necessário fornecer pelo menos um argumento${NC}"
        echo -e "${YELLOW}Use --help para ver as opções disponíveis${NC}"
        exit 1
    fi

    # Processar com arquivo de entrada
    if [ -n "$INPUT_FILE" ]; then
        if [ ! -f "$INPUT_FILE" ]; then
            echo -e "${RED}❌ Arquivo não encontrado: $INPUT_FILE${NC}"
            exit 1
        fi

        if [ ! -r "$INPUT_FILE" ]; then
            echo -e "${RED}❌ Sem permissão de leitura: $INPUT_FILE${NC}"
            exit 1
        fi

        if [ "$EXPORT_ALL" = true ]; then
            export_project "all"
        elif [ "$EXPORT_FILE" = true ]; then
            export_project "file"
        elif [ "$SHOW_TREE" = true ]; then
            show_tree_structure
        elif [ "$SHOW_FILE" = true ]; then
            show_file_content
        else
            echo -e "${YELLOW}⚠ Nenhuma operação específica solicitada. Exibindo conteúdo completo:${NC}"
            cat "$INPUT_FILE"
        fi
    # Processar projeto atual
    elif [ -n "$OUTPUT_FILE" ]; then
        list_current_project
        
        # Se também foi solicitada visualização, executar após gerar
        if [ "$SHOW_TREE" = true ]; then
            echo -e "\n${BLUE}=== VISUALIZAÇÃO DA ESTRUTURA ===${NC}"
            show_tree_structure
        elif [ "$SHOW_FILE" = true ]; then
            echo -e "\n${BLUE}=== VISUALIZAÇÃO DOS ARQUIVOS ===${NC}"
            show_file_content
        fi
    else
        echo -e "${RED}❌ Nenhuma operação válida especificada${NC}"
        echo -e "${YELLOW}Use --help para ver as opções disponíveis${NC}"
        exit 1
    fi
}

# Executar função principal
main "$@"


