import { NextRequest, NextResponse } from 'next/server';
import { loadResume, saveResume, deleteResumeLocal } from '@/lib/storage/resume-storage';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        
        if (!id || id === 'undefined' || id === 'null') {
            return NextResponse.json(
                { error: 'ID inválido' },
                { status: 400 }
            );
        }
        
        const resume = await loadResume(id);
        
        if (!resume) {
            return NextResponse.json(
                { error: 'Currículo não encontrado' },
                { status: 404 }
            );
        }

        return NextResponse.json(resume);
    } catch (error: any) {
        console.error('[API] Error loading resume:', error);
        return NextResponse.json(
            { error: 'Erro ao carregar currículo', details: error.message },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { resumeData } = body;

        if (!resumeData) {
            return NextResponse.json(
                { error: 'resumeData é obrigatório' },
                { status: 400 }
            );
        }

        await saveResume(resumeData, id);
        return NextResponse.json(
            { success: true },
            { status: 200 }
        );
    } catch (error: any) {
        return NextResponse.json(
            { error: 'Erro ao atualizar currículo' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const success = await deleteResumeLocal(id);
        
        if (!success) {
            return NextResponse.json(
                { error: 'Falha ao deletar currículo' },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json(
            { error: 'Erro interno ao deletar' },
            { status: 500 }
        );
    }
}