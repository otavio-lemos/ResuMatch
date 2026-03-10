import { Suspense } from 'react';
import ImportWizardClient from './ImportWizardClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Import Resume - ResuMatch',
    description: 'Upload and map your resume with Artificial Intelligence',
};

export default function ImportPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Preparando importador...</div>}>
            <ImportWizardClient />
        </Suspense>
    );
}
