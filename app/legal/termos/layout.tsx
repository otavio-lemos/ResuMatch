import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Termos de Uso | ResuMatch',
    description: 'Termos de uso e condições de serviço para o ResuMatch.',
};

export default function TermosLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
