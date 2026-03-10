import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Contato | ResuMatch',
    description: 'Entre em contato com nossa equipe.',
};

export default function ContatoLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
