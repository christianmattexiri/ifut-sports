-- 1. Criar Tabela de Modelos de Treino (As "Receitas" de Aula)
CREATE TABLE IF NOT EXISTS futevolei_training_models (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    instructor_id UUID REFERENCES auth.users(id) NOT NULL,
    titulo TEXT NOT NULL,
    foco_principal TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Criar Tabela de Aulas (A Agenda de Treinos)
CREATE TABLE IF NOT EXISTS futevolei_classes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    instructor_id UUID REFERENCES auth.users(id) NOT NULL,
    model_id UUID REFERENCES futevolei_training_models(id),
    data_hora TIMESTAMP WITH TIME ZONE NOT NULL,
    quadra TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Criar Tabela de Presença e Notas do Radar dos Alunos
CREATE TABLE IF NOT EXISTS futevolei_class_attendance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    class_id UUID REFERENCES futevolei_classes(id) ON DELETE CASCADE,
    student_id UUID REFERENCES auth.users(id),
    presenca_confirmada BOOLEAN DEFAULT FALSE,
    nota_saque INTEGER DEFAULT 0,
    nota_recepcao INTEGER DEFAULT 0,
    nota_levantada INTEGER DEFAULT 0,
    nota_ataque INTEGER DEFAULT 0,
    nota_defesa INTEGER DEFAULT 0,
    nota_fisico_tatico INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Adicionar a marcação de Aluno Shadow na tabela de alunos existente
ALTER TABLE futevolei_students ADD COLUMN IF NOT EXISTS is_shadow BOOLEAN DEFAULT FALSE;
