'use client';

// export const metadata = {}; // SEO bypass
import { Mail, Phone, MapPin, Link as LinkIcon } from 'lucide-react';
import { useResumeStore } from '@/store/useResumeStore';
import { ResumeData, AppearanceSettings, PersonalInfo, SkillCategory } from '@/store/useResumeStore';
import { useTranslation } from '@/hooks/useTranslation';
import { classifySkills, separateByType } from '@/lib/ai/skill-classifier';

const LABELS = { pt: 'Atual', en: 'Current' };

function safeCertName(item: any): string {
    if (!item) return 'Certificação';
    const name = item.name;
    const title = item.title;
    if (typeof name === 'string' && name.trim()) return name.trim();
    if (typeof title === 'string' && title.trim()) return title.trim();
    return 'Certificação';
}

function safeString(val: any): string {
    return typeof val === 'string' ? val : '';
}

function getCurrentLabel(lang: string = 'pt'): string {
    return LABELS[lang as keyof typeof LABELS] || LABELS.pt;
}

// ─── ATS UTILITIES ──────────────────────────────────────────────────────────────
export function stripEmojis(text: any): string {
    if (!text) return '';
    const str = String(text);
    // 1. Regex to remove emojis and extended pictographics
    let cleaned = str.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '');
    
    // 2. Normalize Smart Quotes to Straight Quotes
    cleaned = cleaned.replace(/[“”]/g, '"');
    cleaned = cleaned.replace(/[‘’]/g, "'");
    
    // 3. Normalize Em-dashes and En-dashes to simple hyphens
    cleaned = cleaned.replace(/[—–]/g, '-');
    
    return cleaned;
}

export function normalizeAtsDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '';
    // Remove extra spaces
    let str = dateStr.trim();
    if (!str) return '';

    // If it's just a year (YYYY), leave it
    if (/^\d{4}$/.test(str)) return str;

    // Handle existing MM/YYYY or MM-YYYY
    const mmYyyyMatch = str.match(/(\d{1,2})[\/\-\.](\d{4})/);
    if (mmYyyyMatch) {
        const month = mmYyyyMatch[1].padStart(2, '0');
        const year = mmYyyyMatch[2];
        return `${month}/${year}`;
    }

    // Handle spelled out months (pt/en)
    const monthMap: Record<string, string> = {
        'jan': '01', 'january': '01', 'janeiro': '01',
        'feb': '02', 'february': '02', 'fev': '02', 'fevereiro': '02',
        'mar': '03', 'march': '03', 'março': '03',
        'apr': '04', 'april': '04', 'abr': '04', 'abril': '04',
        'may': '05', 'mai': '05', 'maio': '05',
        'jun': '06', 'june': '06', 'junho': '06',
        'jul': '07', 'july': '07', 'julho': '07',
        'aug': '08', 'august': '08', 'ago': '08', 'agosto': '08',
        'sep': '09', 'september': '09', 'set': '09', 'setembro': '09',
        'oct': '10', 'october': '10', 'out': '10', 'outubro': '10',
        'nov': '11', 'november': '11', 'novembro': '11',
        'dec': '12', 'december': '12', 'dez': '12', 'dezembro': '12'
    };

    const monthWordMatch = str.toLowerCase().match(/([a-zç]+)[\s,]+(\d{4})/);
    if (monthWordMatch) {
        const word = monthWordMatch[1];
        const year = monthWordMatch[2];
        
        // Try to match the word
        for (const [key, num] of Object.entries(monthMap)) {
            if (word.startsWith(key)) {
                return `${num}/${year}`;
            }
        }
    }

    // Return original if no match (to avoid destroying unknown valid text like 'Present')
    return str;
}


// ─── ATS-SAFE FONT MAP ─────────────────────────────────────────────────────────
const FONT_MAP: Record<string, string> = {
    'Inter': "'Inter', Arial, sans-serif",
    'Arial': "Arial, sans-serif",
    'Calibri': "'Calibri', 'Gill Sans', sans-serif",
    'Georgia': "Georgia, 'Times New Roman', serif",
    'Times New Roman': "'Times New Roman', Times, serif",
    'Roboto': "'Roboto', Arial, sans-serif",
};

const PAGE_SIZES = {
    'A4': { width: '210mm', minHeight: '297mm' },
    'LETTER': { width: '215.9mm', minHeight: '279.4mm' },
    'LEGAL': { width: '215.9mm', minHeight: '355.6mm' },
    'EXECUTIVE': { width: '184.1mm', minHeight: '266.7mm' },
};

const SECTION_MARGIN_BOTTOM = '16px';
const LIST_PADDING_LEFT = '0px';

function getStyles(appearance: AppearanceSettings): React.CSSProperties {
    const size = PAGE_SIZES[appearance.pageSize] || PAGE_SIZES['A4'];
    return {
        fontFamily: FONT_MAP[appearance.fontFamily] || FONT_MAP['Arial'],
        fontSize: `${appearance.fontSize}pt`,
        lineHeight: appearance.lineSpacing,
        width: size.width,
        minHeight: size.minHeight,
    };
}

// ─── HELPER: Photo Component ──────────────────────────────────────────────────
function ResumePhoto({ url, size = '80px' }: { url?: string, size?: string }) {
    if (!url) return null;
    return (
        <div style={{
            flexShrink: 0,
            width: size,
            height: size,
            borderRadius: '0px',
            overflow: 'hidden',
            border: '2px solid #000000',
            marginBottom: '10px'
        }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
    );
}

// ─── HELPER: Disclaimer Component ─────────────────────────────────────────────
function PrintDisclaimer({ t }: { t: (key: string) => string }) {
    return (
        <div className="no-print mt-8 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs text-center max-w-[210mm] mx-auto">
            <p className="font-semibold mb-1">
                {t('editor.printDisclaimer')}
            </p>
        </div>
    );
}

// ─── TEMPLATE 1: Classic Executive ─────────────────────────────────────────────
function TemplateClassic({ data, currentLabel }: { data: ResumeData; currentLabel?: string }) {
    if (!data) return null;
    const { personalInfo = {} as PersonalInfo, summary, experiences = [], education = [], skills = [], appearance = {} as AppearanceSettings, sectionsConfig = [] } = data;
    const style = getStyles(appearance);

    return (
        <div className="resume-container" style={{ ...style, background: 'white', color: '#000000', padding: '15mm', boxSizing: 'border-box' }}>
            <header style={{ borderBottom: '2px solid #000000', paddingBottom: '5mm', marginBottom: '5mm', display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                <ResumePhoto url={personalInfo.photoUrl} size="90px" />
                <div style={{ flex: 1 }}>
                    <h2 style={{ fontSize: 'inherit', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#000000', marginBottom: '4px' }}>
                        {stripEmojis(personalInfo.fullName) || 'SEU NOME'}
                    </h2>
                    <p style={{ fontSize: 'inherit', fontWeight: 500, color: '#000000', textTransform: 'uppercase', marginBottom: '12px' }}>
                        {stripEmojis(personalInfo.title) || 'SEU CARGO'}
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: 'inherit', color: '#000000' }}>
                        {[
                            personalInfo.email,
                            personalInfo.phone ? `• ${personalInfo.phone}` : '',
                            personalInfo.location ? `• ${personalInfo.location}` : '',
                            personalInfo.linkedin ? `• ${personalInfo.linkedin}` : '',
                            personalInfo.github ? `• ${personalInfo.github}` : '',
                            personalInfo.portfolio ? `• ${personalInfo.portfolio}` : ''
                        ].filter(Boolean).map((item, idx) => (
                            <span key={idx}>{stripEmojis(item)}</span>
                        ))}
                    </div>
                </div>
            </header>

            {(sectionsConfig || []).filter(s => s.active && s.id !== 'personal').map(section => {
                if (section.id === 'summary' && summary) {
                    return (
                        <section key={section.id} style={{ marginBottom: SECTION_MARGIN_BOTTOM }}>
                            <h2 style={{ fontSize: 'inherit', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', borderBottom: '1px solid #000000', paddingBottom: '4px', marginBottom: '10px' }}>
                                {stripEmojis(section.title)}
                            </h2>
                            <p style={{ fontSize: 'inherit', color: '#000000', textAlign: 'justify', whiteSpace: 'pre-line', lineHeight: style.lineHeight }}>{stripEmojis(summary)}</p>
                        </section>
                    );
                }

                if (section.id === 'experience' && experiences.length > 0) {
                    return (
                        <section key={section.id} style={{ marginBottom: SECTION_MARGIN_BOTTOM }}>
                            <h2 style={{ fontSize: 'inherit', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', borderBottom: '1px solid #000000', paddingBottom: '4px', marginBottom: '12px' }}>
                                {stripEmojis(section.title)}
                            </h2>
                            {experiences.map(exp => (
                                <div key={exp.id} style={{ marginBottom: '14px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2px' }}>
                                        <strong style={{ color: '#000000' }}>{stripEmojis(exp.position)}</strong>
                                        <span style={{ fontSize: 'inherit', color: '#000000', fontWeight: 600 }}>
                                            {normalizeAtsDate(exp.startDate)} — {exp.current ? getCurrentLabel('pt') : exp.endDate}
                                        </span>
                                    </div>
                                    <p style={{ fontSize: 'inherit', color: '#000000', fontStyle: 'italic', marginBottom: '4px' }}>
                                        {stripEmojis(exp.company)}{exp.location && `, ${stripEmojis(exp.location)}`}
                                    </p>
                                    <p style={{ fontSize: 'inherit', color: '#000000', whiteSpace: 'pre-line', lineHeight: style.lineHeight }}>{stripEmojis(exp.description)}</p>
                                </div>
                            ))}
                        </section>
                    );
                }

                if (section.id === 'education' && education.length > 0) {
                    return (
                        <section key={section.id} style={{ marginBottom: SECTION_MARGIN_BOTTOM }}>
                            <h2 style={{ fontSize: 'inherit', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', borderBottom: '1px solid #000000', paddingBottom: '4px', marginBottom: '12px' }}>
                                {stripEmojis(section.title)}
                            </h2>
                            {education.map(edu => (
                                <div key={edu.id} style={{ marginBottom: '10px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                        <strong style={{ color: '#000000' }}>{stripEmojis(edu.degree)}</strong>
                                        <span style={{ fontSize: 'inherit', color: '#000000' }}>{normalizeAtsDate(edu.startDate)}{edu.current ? ` — ${getCurrentLabel(data?.language || 'pt')}` : edu.endDate && ` — ${normalizeAtsDate(edu.endDate)}`}</span>
                                    </div>
                                    <p style={{ fontSize: 'inherit', color: '#000000' }}>{stripEmojis(edu.institution)}{edu.location && `, ${stripEmojis(edu.location)}`}</p>
                                </div>
                            ))}
                        </section>
                    );
                }

                if (section.id === 'skills' && skills.length > 0) {
                    const classified = classifySkills(skills);
                    const { hard, soft } = separateByType(classified);
                    const hardSkills = hard.flatMap(s => s.skills).filter(Boolean);
                    const softSkills = soft.flatMap(s => s.skills).filter(Boolean);
                    const hardLabel = 'Hard Skills';
                    const softLabel = 'Soft Skills';

                    return (
                        <section key={section.id} style={{ marginBottom: SECTION_MARGIN_BOTTOM }}>
                            <h2 style={{ fontSize: 'inherit', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', borderBottom: '1px solid #000000', paddingBottom: '4px', marginBottom: '10px' }}>
                                {stripEmojis(section.title)}
                            </h2>
                            {hardSkills.length > 0 && (
                                <div style={{ marginBottom: '14px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2px' }}>
                                        <strong style={{ color: '#000000' }}>{hardLabel}</strong>
                                    </div>
                                    <p style={{ fontSize: 'inherit', color: '#000000', whiteSpace: 'pre-line', lineHeight: style.lineHeight }}>{hardSkills.map(stripEmojis).join(', ')}</p>
                                </div>
                            )}
                            {softSkills.length > 0 && (
                                <div style={{ marginBottom: '14px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2px' }}>
                                        <strong style={{ color: '#000000' }}>{softLabel}</strong>
                                    </div>
                                    <p style={{ fontSize: 'inherit', color: '#000000', whiteSpace: 'pre-line', lineHeight: style.lineHeight }}>{softSkills.map(stripEmojis).join(', ')}</p>
                                </div>
                            )}
                        </section>
                    );
                }

                // Render Custom Sections
                if (section.type === 'TEXT') {
                    return (
                        <section key={section.id} style={{ marginBottom: SECTION_MARGIN_BOTTOM }}>
                            <h2 style={{ fontSize: 'inherit', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', borderBottom: '1px solid #000000', paddingBottom: '4px', marginBottom: '10px' }}>
                                {stripEmojis(section.title)}
                            </h2>
                            <p style={{ fontSize: 'inherit', color: '#000000', whiteSpace: 'pre-line', lineHeight: style.lineHeight }}>{stripEmojis(section.content)}</p>
                        </section>
                    );
                }

                if (section.type === 'SIMPLE_LIST') {
                    return (
                        <section key={section.id} style={{ marginBottom: SECTION_MARGIN_BOTTOM }}>
                            <h2 style={{ fontSize: 'inherit', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', borderBottom: '1px solid #000000', paddingBottom: '4px', marginBottom: '10px' }}>
                                {stripEmojis(section.title)}
                            </h2>
                            <ul style={{ fontSize: 'inherit', fontFamily: style.fontFamily, lineHeight: style.lineHeight, color: '#000000', paddingLeft: LIST_PADDING_LEFT, listStyleType: 'disc' }}>
                                {(section.items as any[] || []).map((item, idx) => (
                                    <li key={idx} style={{ marginBottom: '4px', fontSize: 'inherit', fontFamily: style.fontFamily, lineHeight: style.lineHeight }}>
                                        {section.id === 'certifications' && item && typeof item === 'object' ? (
                                            <span style={{ fontSize: 'inherit', fontFamily: style.fontFamily, lineHeight: style.lineHeight }}><strong style={{ fontSize: 'inherit', fontFamily: style.fontFamily, lineHeight: style.lineHeight }}>{stripEmojis(safeCertName(item))}</strong>{safeString(item.issuer) && <span style={{ fontSize: 'inherit', fontFamily: style.fontFamily, lineHeight: style.lineHeight }}> — {stripEmojis(item.issuer)}</span>}{safeString(item.date) && <span style={{ fontSize: 'inherit', fontFamily: style.fontFamily, lineHeight: style.lineHeight }}> ({normalizeAtsDate(item.date)})</span>}</span>
                                        ) : typeof item === 'object' && item !== null ? (
                                            <span style={{ fontSize: 'inherit', fontFamily: style.fontFamily, lineHeight: style.lineHeight }}><strong style={{ fontSize: 'inherit', fontFamily: style.fontFamily, lineHeight: style.lineHeight }}>{safeCertName(item)}</strong>{safeString(item.description) && <span style={{ fontSize: 'inherit', fontFamily: style.fontFamily, lineHeight: style.lineHeight }}> — {stripEmojis(item.description)}</span>}</span>
                                        ) : <span style={{ fontSize: 'inherit', fontFamily: style.fontFamily, lineHeight: style.lineHeight }}>{stripEmojis(String(item))}</span>}
                                    </li>
                                ))}
                            </ul>
                        </section>
                    );
                }

                if (section.type === 'DATED_LIST') {
                    return (
                        <section key={section.id} style={{ marginBottom: SECTION_MARGIN_BOTTOM }}>
                            <h2 style={{ fontSize: 'inherit', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', borderBottom: '1px solid #000000', paddingBottom: '4px', marginBottom: '12px' }}>
                                {stripEmojis(section.title)}
                            </h2>
                            {(section.items as any[] || []).map(item => (
                                <div key={item.id} style={{ marginBottom: '14px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2px' }}>
                                        <strong style={{ color: '#000000' }}>{stripEmojis(item.title)}</strong>
                                        <span style={{ fontSize: 'inherit', color: '#000000', fontWeight: 600 }}>
                                            {normalizeAtsDate(item.startDate)}{item.endDate && ` — ${normalizeAtsDate(item.endDate)}`}
                                        </span>
                                    </div>
                                    <p style={{ fontSize: 'inherit', color: '#000000', fontStyle: 'italic', marginBottom: '4px' }}>
                                        {stripEmojis(item.subtitle)}{item.location && `, ${stripEmojis(item.location)}`}
                                    </p>
                                    <p style={{ fontSize: 'inherit', color: '#000000', whiteSpace: 'pre-line', lineHeight: style.lineHeight }}>{stripEmojis(item.description)}</p>
                                </div>
                            ))}
                        </section>
                    );
                }

                return null;
            })}
        </div>
    );
}

// ─── TEMPLATE 2: Modern Two-Column ─────────────────────────────────────────────
function TemplateModern({ data, currentLabel }: { data: ResumeData; currentLabel?: string }) {
    if (!data) return null;
    const { personalInfo = {} as PersonalInfo, summary, experiences = [], education = [], skills = [], appearance = {} as AppearanceSettings, sectionsConfig = [] } = data;
    const style = getStyles(appearance);

    return (
        <div className="resume-container" style={{ ...style, background: 'white', display: 'flex', boxSizing: 'border-box' }}>
            {/* Left Sidebar - Adjusted for 210mm total width */}
            <div style={{ width: '55mm', background: '#1e293b', color: 'white', padding: '15mm 15mm', flexShrink: 0 }}>
                <ResumePhoto url={personalInfo.photoUrl} size="120px" />

                <div style={{ marginBottom: SECTION_MARGIN_BOTTOM }}>
                    <h2 style={{ fontSize: 'inherit', fontWeight: 700, color: 'white', lineHeight: 1.2, marginBottom: '6px' }}>
                        {personalInfo.fullName || 'SEU NOME'}
                    </h2>
                    <p style={{ fontSize: 'inherit', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        {personalInfo.title || ''}
                    </p>
                </div>

                <div style={{ marginBottom: SECTION_MARGIN_BOTTOM }}>
                    <h3 style={{ fontSize: 'inherit', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#60a5fa', marginBottom: '8px' }}>{data.language === 'en' ? 'Contact' : 'Contato'}</h3>
                    {[
                        { label: personalInfo.email },
                        { label: personalInfo.phone },
                        { label: personalInfo.location },
                        { label: personalInfo.linkedin },
                        { label: personalInfo.github },
                        { label: personalInfo.portfolio },
                    ].filter(i => i.label).map((item, idx) => (
                        <p key={idx} style={{ fontSize: 'inherit', color: '#cbd5e1', marginBottom: '4px', wordBreak: 'break-all' }}>{item.label}</p>
                    ))}
                </div>

                {skills.length > 0 && (
                    <div>
                        <h3 style={{ fontSize: 'inherit', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#60a5fa', marginBottom: '8px' }}>{data.language === 'en' ? 'Skills' : 'Competências'}</h3>
                        {(() => {
                            const classified = classifySkills(skills);
                            const { hard, soft } = separateByType(classified);
                            const hardSkills = hard.flatMap(s => s.skills).filter(Boolean);
                            const softSkills = soft.flatMap(s => s.skills).filter(Boolean);
                            const hardLabel = 'Hard Skills';
                            const softLabel = 'Soft Skills';
                            return (
                                <>
                                    {hardSkills.length > 0 && (
                                        <div style={{ marginBottom: '14px' }}>
                                            <p style={{ fontSize: 'inherit', fontWeight: 600, color: '#e2e8f0', marginBottom: '4px' }}>{hardLabel}</p>
                                            <p style={{ fontSize: 'inherit', color: '#cbd5e1', marginBottom: '4px', wordBreak: 'break-all', lineHeight: style.lineHeight }}>{hardSkills.map(stripEmojis).join(', ')}</p>
                                        </div>
                                    )}
                                    {softSkills.length > 0 && (
                                        <div style={{ marginBottom: '14px' }}>
                                            <p style={{ fontSize: 'inherit', fontWeight: 600, color: '#e2e8f0', marginBottom: '4px' }}>{softLabel}</p>
                                            <p style={{ fontSize: 'inherit', color: '#cbd5e1', marginBottom: '4px', wordBreak: 'break-all', lineHeight: style.lineHeight }}>{softSkills.map(stripEmojis).join(', ')}</p>
                                        </div>
                                    )}
                                </>
                            );
                        })()}
                    </div>
                )}
            </div>

            {/* Right Main Content */}
            <div style={{ flex: 1, padding: '15mm', overflow: 'hidden' }}>
                {(sectionsConfig || []).filter(s => s.active && s.id !== 'personal').map(section => {
                    const sectionStyle = { marginBottom: SECTION_MARGIN_BOTTOM };
                    const headingStyle = { fontSize: 'inherit', fontFamily: style.fontFamily, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: '#1e40af', borderBottom: '2px solid #1e40af', paddingBottom: '4px', marginBottom: '12px' };

                    if (section.id === 'summary' && summary) {
                        return (
                            <section key={section.id} style={sectionStyle}>
                                <h2 style={headingStyle}>{section.title}</h2>
                                <p style={{ fontSize: 'inherit', fontFamily: style.fontFamily, lineHeight: style.lineHeight, color: '#000000', textAlign: 'justify', whiteSpace: 'pre-line' }}>{summary}</p>
                            </section>
                        );
                    }

                    if (section.id === 'experience' && experiences.length > 0) {
                        return (
                            <section key={section.id} style={sectionStyle}>
                                <h2 style={headingStyle}>{section.title}</h2>
                                {experiences.map(exp => (
                                    <div key={exp.id} style={{ marginBottom: '14px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                            <strong style={{ color: '#000000', fontSize: 'inherit' }}>{exp.position}</strong>
                                            <span style={{ fontSize: 'inherit', color: '#000000' }}>                                            {normalizeAtsDate(exp.startDate)} — {exp.current ? getCurrentLabel('pt') : exp.endDate}</span>
                                        </div>
                                        <p style={{ fontSize: 'inherit', color: '#1e40af', marginBottom: '4px' }}>{exp.company}{exp.location && `, ${exp.location}`}</p>
                                        <p style={{ fontSize: 'inherit', color: '#000000', whiteSpace: 'pre-line', lineHeight: style.lineHeight }}>{exp.description}</p>
                                    </div>
                                ))}
                            </section>
                        );
                    }

                    if (section.id === 'education' && education.length > 0) {
                        return (
                            <section key={section.id} style={sectionStyle}>
                                <h2 style={headingStyle}>{section.title}</h2>
                                {education.map(edu => (
                                    <div key={edu.id} style={{ marginBottom: '10px' }}>
                                        <strong style={{ fontSize: 'inherit', color: '#000000' }}>{edu.degree}</strong>
                                        <p style={{ fontSize: 'inherit', color: '#000000' }}>{edu.institution}{edu.location && `, ${edu.location}`}</p>
                                        <p style={{ fontSize: 'inherit', color: '#000000' }}>{normalizeAtsDate(edu.startDate)}{edu.current ? ` — ${getCurrentLabel(data?.language || 'pt')}` : edu.endDate && ` — ${normalizeAtsDate(edu.endDate)}`}</p>
                                    </div>
                                ))}
                            </section>
                        );
                    }

                    if (section.id === 'skills' && skills.length > 0) {
                        const classified = classifySkills(skills);
                        const { hard, soft } = separateByType(classified);
                        const hardSkills = hard.flatMap(s => s.skills).filter(Boolean);
                        const softSkills = soft.flatMap(s => s.skills).filter(Boolean);
                        const hardLabel = data?.language === 'en' ? 'Hard Skills' : 'Hard Skills';
                        const softLabel = data?.language === 'en' ? 'Soft Skills' : 'Soft Skills';

                        return (
                            <section key={section.id} style={sectionStyle}>
                                <h2 style={headingStyle}>{section.title}</h2>
                                {hardSkills.length > 0 && (
                                    <div style={{ marginBottom: '14px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                            <strong style={{ color: '#000000', fontSize: 'inherit' }}>{hardLabel}</strong>
                                        </div>
                                        <p style={{ fontSize: 'inherit', color: '#000000', whiteSpace: 'pre-line', lineHeight: style.lineHeight }}>{hardSkills.map(stripEmojis).join(', ')}</p>
                                    </div>
                                )}
                                {softSkills.length > 0 && (
                                    <div style={{ marginBottom: '14px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                            <strong style={{ color: '#000000', fontSize: 'inherit' }}>{softLabel}</strong>
                                        </div>
                                        <p style={{ fontSize: 'inherit', color: '#000000', whiteSpace: 'pre-line', lineHeight: style.lineHeight }}>{softSkills.map(stripEmojis).join(', ')}</p>
                                    </div>
                                )}
                            </section>
                        );
                    }

                    if (section.type === 'TEXT') {
                        return (
                            <section key={section.id} style={sectionStyle}>
                                <h2 style={headingStyle}>{section.title}</h2>
                                <p style={{ fontSize: 'inherit', color: '#000000', whiteSpace: 'pre-line', lineHeight: style.lineHeight }}>{section.content}</p>
                            </section>
                        );
                    }

                    if (section.type === 'SIMPLE_LIST') {
                        const isCertSection = section.id === 'certifications';
                        return (
                            <section key={section.id} style={sectionStyle}>
                                <h2 style={headingStyle}>{section.title}</h2>
                                <ul style={{ fontSize: 'inherit', fontFamily: style.fontFamily, lineHeight: style.lineHeight, color: '#000000', paddingLeft: LIST_PADDING_LEFT, listStyleType: 'disc' }}>
                                    {(section.items as any[] || []).map((item, idx) => (
                                        <li key={idx} style={{ marginBottom: '3px', fontSize: 'inherit', fontFamily: style.fontFamily, lineHeight: style.lineHeight }}>
                                            {isCertSection && item && typeof item === 'object' ? (
                                                <span style={{ fontSize: 'inherit', fontFamily: style.fontFamily, lineHeight: style.lineHeight }}><strong style={{ fontSize: 'inherit', fontFamily: style.fontFamily, lineHeight: style.lineHeight }}>{safeCertName(item)}</strong>{safeString(item.issuer) && <span style={{ fontSize: 'inherit', fontFamily: style.fontFamily, lineHeight: style.lineHeight }}> — {stripEmojis(item.issuer)}</span>}{safeString(item.date) && <span style={{ fontSize: 'inherit', fontFamily: style.fontFamily, lineHeight: style.lineHeight }}> ({normalizeAtsDate(item.date)})</span>}</span>
                                            ) : typeof item === 'object' && item !== null ? (
                                                <span style={{ fontSize: 'inherit', fontFamily: style.fontFamily, lineHeight: style.lineHeight }}><strong style={{ fontSize: 'inherit', fontFamily: style.fontFamily, lineHeight: style.lineHeight }}>{safeCertName(item)}</strong>{safeString(item.description) && <span style={{ fontSize: 'inherit', fontFamily: style.fontFamily, lineHeight: style.lineHeight }}> — {stripEmojis(item.description)}</span>}</span>
                                            ) : <span style={{ fontSize: 'inherit', fontFamily: style.fontFamily, lineHeight: style.lineHeight }}>{String(item)}</span>}
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        );
                    }

                    if (section.type === 'DATED_LIST') {
                        return (
                            <section key={section.id} style={sectionStyle}>
                                <h2 style={headingStyle}>{section.title}</h2>
                                {(section.items as any[] || []).map(item => (
                                    <div key={item.id} style={{ marginBottom: '12px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                            <strong style={{ color: '#000000', fontSize: 'inherit' }}>{item.title}</strong>
                                            <span style={{ fontSize: 'inherit', color: '#000000' }}>{normalizeAtsDate(item.startDate)}{item.endDate && ` — ${normalizeAtsDate(item.endDate)}`}</span>
                                        </div>
                                        <p style={{ fontSize: 'inherit', color: '#1e40af' }}>{item.subtitle}{item.location && `, ${item.location}`}</p>
                                        <p style={{ fontSize: 'inherit', color: '#000000', whiteSpace: 'pre-line', lineHeight: style.lineHeight }}>{item.description}</p>
                                    </div>
                                ))}
                            </section>
                        );
                    }

                    return null;
                })}
            </div>
        </div>
    );
}

// ─── TEMPLATE 3: Vienna (With Photo) ──────────────────────────────────────────
function TemplateVienna({ data, currentLabel }: { data: ResumeData; currentLabel?: string }) {
    if (!data) return null;
    const { personalInfo = {} as PersonalInfo, summary, experiences = [], education = [], skills = [], appearance = {} as AppearanceSettings, sectionsConfig = [] } = data;
    const style = getStyles(appearance);

    return (
        <div className="resume-container" style={{ ...style, background: 'white', color: '#000000', padding: '15mm', boxSizing: 'border-box' }}>
            <header style={{ display: 'flex', alignItems: 'center', gap: '24px', borderBottom: '2px solid #3b82f6', paddingBottom: '5mm', marginBottom: SECTION_MARGIN_BOTTOM }}>
                <ResumePhoto url={personalInfo.photoUrl} size="100px" />
                <div style={{ flex: 1 }}>
                    <h2 style={{ fontSize: 'inherit', fontWeight: 800, color: '#1e3a8a', letterSpacing: '-0.02em', marginBottom: '4px', lineHeight: 1.1 }}>
                        {stripEmojis(personalInfo.fullName) || 'SEU NOME'}
                    </h2>
                    <p style={{ fontSize: 'inherit', color: '#3b82f6', fontWeight: 600, paddingBottom: '8px', marginBottom: '8px' }}>
                        {stripEmojis(personalInfo.title) || 'Seu Cargo Desejado'}
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', rowGap: '4px', columnGap: '16px', fontSize: 'inherit', color: '#000000' }}>
                        {personalInfo.email && <span>• {stripEmojis(personalInfo.email)}</span>}
                        {personalInfo.phone && <span>• {stripEmojis(personalInfo.phone)}</span>}
                        {personalInfo.location && <span>• {stripEmojis(personalInfo.location)}</span>}
                        {personalInfo.linkedin && <span>• {stripEmojis(personalInfo.linkedin)}</span>}
                        {personalInfo.github && <span>• {stripEmojis(personalInfo.github)}</span>}
                        {personalInfo.portfolio && <span>• {stripEmojis(personalInfo.portfolio)}</span>}
                    </div>
                </div>
            </header>

            {(sectionsConfig || []).filter(s => s.active && s.id !== 'personal').map(section => {
                const sectionStyle = { marginBottom: SECTION_MARGIN_BOTTOM };
                const headingStyle = { fontSize: 'inherit', fontWeight: 700, textTransform: 'uppercase' as const, color: '#1e3a8a', borderBottom: '1px solid #bfdbfe', paddingBottom: '4px', marginBottom: '12px', letterSpacing: '0.05em' };

                if (section.id === 'summary' && summary) {
                    return (
                        <section key={section.id} style={sectionStyle}>
                            <h2 style={headingStyle}>{stripEmojis(section.title)}</h2>
                            <p style={{ fontSize: 'inherit', textAlign: 'justify', lineHeight: style.lineHeight, color: '#000000', whiteSpace: 'pre-line' }}>{stripEmojis(summary)}</p>
                        </section>
                    );
                }

                if (section.id === 'experience' && experiences.length > 0) {
                    return (
                        <section key={section.id} style={sectionStyle}>
                            <h2 style={headingStyle}>{stripEmojis(section.title)}</h2>
                            {experiences.map(exp => (
                                <div key={exp.id} style={{ marginBottom: '18px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2px' }}>
                                        <h3 style={{ fontSize: 'inherit', fontWeight: 700, color: '#000000', margin: 0 }}>{stripEmojis(exp.position)}</h3>
                                        <span style={{ fontSize: 'inherit', color: '#3b82f6', fontWeight: 600 }}>{normalizeAtsDate(exp.startDate)} – {exp.current ? 'Present' : exp.endDate}</span>
                                    </div>
                                    <div style={{ fontSize: 'inherit', fontWeight: 500, color: '#000000', marginBottom: '6px' }}>
                                        {stripEmojis(exp.company)}{exp.location && ` | ${stripEmojis(exp.location)}`}
                                    </div>
                                    <p style={{ fontSize: 'inherit', color: '#000000', whiteSpace: 'pre-line', lineHeight: style.lineHeight, margin: 0 }}>{stripEmojis(exp.description)}</p>
                                </div>
                            ))}
                        </section>
                    );
                }

                if (section.id === 'education' && education.length > 0) {
                    return (
                        <section key={section.id} style={sectionStyle}>
                            <h2 style={headingStyle}>{stripEmojis(section.title)}</h2>
                            {education.map(edu => (
                                <div key={edu.id} style={{ marginBottom: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2px' }}>
                                        <h3 style={{ fontSize: 'inherit', fontWeight: 700, color: '#000000', margin: 0 }}>{stripEmojis(edu.degree)}</h3>
                                        <span style={{ fontSize: 'inherit', color: '#000000' }}>{normalizeAtsDate(edu.startDate)}{edu.current ? ` – ${getCurrentLabel(data?.language || 'pt')}` : ` – ${normalizeAtsDate(edu.endDate)}`}</span>
                                    </div>
                                    <div style={{ fontSize: 'inherit', color: '#000000' }}>
                                        {stripEmojis(edu.institution)}{edu.location && ` | ${stripEmojis(edu.location)}`}
                                    </div>
                                </div>
                            ))}
                        </section>
                    );
                }

                if (section.id === 'skills' && skills.length > 0) {
                    const classified = classifySkills(skills);
                    const { hard, soft } = separateByType(classified);
                    const hardSkills = hard.flatMap(s => s.skills).filter(Boolean);
                    const softSkills = soft.flatMap(s => s.skills).filter(Boolean);
                    const hardLabel = data?.language === 'en' ? 'Hard Skills' : 'Hard Skills';
                    const softLabel = data?.language === 'en' ? 'Soft Skills' : 'Soft Skills';

                    return (
                        <section key={section.id} style={sectionStyle}>
                            <h2 style={headingStyle}>{stripEmojis(section.title)}</h2>
                            {hardSkills.length > 0 && (
                                <div style={{ marginBottom: '18px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2px' }}>
                                        <h3 style={{ fontSize: 'inherit', fontWeight: 700, color: '#000000', margin: 0 }}>{hardLabel}</h3>
                                    </div>
                                    <p style={{ fontSize: 'inherit', color: '#000000', whiteSpace: 'pre-line', lineHeight: style.lineHeight, margin: 0 }}>{hardSkills.map(stripEmojis).join(', ')}</p>
                                </div>
                            )}
                            {softSkills.length > 0 && (
                                <div style={{ marginBottom: '18px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2px' }}>
                                        <h3 style={{ fontSize: 'inherit', fontWeight: 700, color: '#000000', margin: 0 }}>{softLabel}</h3>
                                    </div>
                                    <p style={{ fontSize: 'inherit', color: '#000000', whiteSpace: 'pre-line', lineHeight: style.lineHeight, margin: 0 }}>{softSkills.map(stripEmojis).join(', ')}</p>
                                </div>
                            )}
                        </section>
                    );
                }

                if (section.type === 'TEXT') {
                    return (
                        <section key={section.id} style={sectionStyle}>
                            <h2 style={headingStyle}>{stripEmojis(section.title)}</h2>
                            <p style={{ fontSize: 'inherit', whiteSpace: 'pre-line', color: '#000000', lineHeight: style.lineHeight, margin: 0 }}>{stripEmojis(section.content)}</p>
                        </section>
                    );
                }

                if (section.type === 'SIMPLE_LIST') {
                    const isCertSection = section.id === 'certifications';
                    return (
                        <section key={section.id} style={sectionStyle}>
                            <h2 style={headingStyle}>{stripEmojis(section.title)}</h2>
                            <ul style={{ fontSize: 'inherit', fontFamily: style.fontFamily, lineHeight: style.lineHeight, color: '#000000', paddingLeft: LIST_PADDING_LEFT, listStyleType: 'disc', margin: 0 }}>
                                {(section.items as any[] || []).map((item, idx) => (
                                    <li key={idx} style={{ marginBottom: '6px', fontSize: 'inherit', fontFamily: style.fontFamily, lineHeight: style.lineHeight }}>
                                        {isCertSection && item && typeof item === 'object' ? (
                                            <span style={{ fontSize: 'inherit', fontFamily: style.fontFamily, lineHeight: style.lineHeight }}><strong style={{ fontSize: 'inherit', fontFamily: style.fontFamily, lineHeight: style.lineHeight }}>{stripEmojis(safeCertName(item))}</strong>{safeString(item.issuer) && <span style={{ fontSize: 'inherit', fontFamily: style.fontFamily, lineHeight: style.lineHeight }}> — {stripEmojis(item.issuer)}</span>}{safeString(item.date) && <span style={{ fontSize: 'inherit', fontFamily: style.fontFamily, lineHeight: style.lineHeight }}> ({normalizeAtsDate(item.date)})</span>}</span>
                                        ) : typeof item === 'object' && item !== null ? (
                                            <span style={{ fontSize: 'inherit', fontFamily: style.fontFamily, lineHeight: style.lineHeight }}><strong style={{ fontSize: 'inherit', fontFamily: style.fontFamily, lineHeight: style.lineHeight }}>{stripEmojis(safeCertName(item))}</strong>{safeString(item.description) && <span style={{ fontSize: 'inherit', fontFamily: style.fontFamily, lineHeight: style.lineHeight }}> — {stripEmojis(item.description)}</span>}</span>
                                        ) : <span style={{ fontSize: 'inherit', fontFamily: style.fontFamily, lineHeight: style.lineHeight }}>{stripEmojis(String(item))}</span>}
                                    </li>
                                ))}
                            </ul>
                        </section>
                    );
                }

                if (section.type === 'DATED_LIST') {
                    return (
                        <section key={section.id} style={sectionStyle}>
                            <h2 style={headingStyle}>{stripEmojis(section.title)}</h2>
                            {(section.items as any[] || []).map(item => (
                                <div key={item.id} style={{ marginBottom: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2px' }}>
                                        <h3 style={{ fontSize: 'inherit', fontWeight: 700, color: '#000000', margin: 0 }}>{stripEmojis(item.title)}</h3>
                                        <span style={{ fontSize: 'inherit', color: '#000000' }}>{normalizeAtsDate(item.startDate)} – {normalizeAtsDate(item.endDate)}</span>
                                    </div>
                                    {item.subtitle && <div style={{ fontSize: 'inherit', color: '#000000', marginBottom: '4px' }}>{stripEmojis(item.subtitle)}{item.location && ` | ${stripEmojis(item.location)}`}</div>}
                                    <p style={{ fontSize: 'inherit', whiteSpace: 'pre-line', color: '#000000', lineHeight: style.lineHeight, margin: 0 }}>{stripEmojis(item.description)}</p>
                                </div>
                            ))}
                        </section>
                    );
                }

                return null;
            })}
        </div>
    );
}
// ─── TEMPLATE 3: Minimalist Clean ──────────────────────────────────────────────
function TemplateMinimalist({ data, currentLabel }: { data: ResumeData; currentLabel?: string }) {
    if (!data) return null;
    const { personalInfo = {} as PersonalInfo, summary, experiences = [], education = [], skills = [], appearance = {} as AppearanceSettings, sectionsConfig = [] } = data;
    const style = getStyles(appearance);

    return (
        <div className="resume-container" style={{ ...style, background: 'white', color: '#000000', padding: '15mm', boxSizing: 'border-box' }}>
            {/* Centered header */}
            <header style={{ textAlign: 'center', marginBottom: SECTION_MARGIN_BOTTOM, paddingBottom: '20px', borderBottom: '1px solid #000000' }}>
                <ResumePhoto url={personalInfo.photoUrl} size="100px" />
                <h2 style={{ fontSize: 'inherit', fontWeight: 300, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#000000', marginBottom: '4px' }}>
                    {personalInfo.fullName || 'SEU NOME'}
                </h2>
                {personalInfo.title && (
                    <p style={{ fontSize: 'inherit', color: '#000000', letterSpacing: '0.1em', marginBottom: '10px' }}>{personalInfo.title}</p>
                )}
                <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '12px', fontSize: 'inherit', color: '#000000' }}>
                    {personalInfo.email && <span>{personalInfo.email}</span>}
                    {personalInfo.phone && <span>|</span>}
                    {personalInfo.phone && <span>{personalInfo.phone}</span>}
                    {personalInfo.location && <span>|</span>}
                    {personalInfo.location && <span>{personalInfo.location}</span>}
                    {personalInfo.linkedin && <span>|</span>}
                    {personalInfo.linkedin && <span>{personalInfo.linkedin}</span>}
                    {personalInfo.github && <span>|</span>}
                    {personalInfo.github && <span>{personalInfo.github}</span>}
                    {personalInfo.portfolio && <span>|</span>}
                    {personalInfo.portfolio && <span>{personalInfo.portfolio}</span>}
                </div>
            </header>

            {(sectionsConfig || []).filter(s => s.active && s.id !== 'personal').map(section => {
                const sectionStyle = { marginBottom: SECTION_MARGIN_BOTTOM };
                const headingStyle = { fontSize: 'inherit', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.15em', color: '#000000', marginBottom: '10px', borderTop: '1px solid #000000', paddingTop: '12px' };

                if (section.id === 'summary' && summary) {
                    return (
                        <section key={section.id} style={sectionStyle}>
                            <h2 style={{ ...headingStyle, borderTop: 'none', paddingTop: 0, marginBottom: '6px' }}>{section.title}</h2>
                            <p style={{ fontSize: 'inherit', color: '#000000', lineHeight: style.lineHeight, whiteSpace: 'pre-line' }}>{summary}</p>
                        </section>
                    );
                }

                if (section.id === 'experience' && experiences.length > 0) {
                    return (
                        <section key={section.id} style={sectionStyle}>
                            <h2 style={headingStyle}>{section.title}</h2>
                            {experiences.map(exp => (
                                <div key={exp.id} style={{ marginBottom: '14px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <strong style={{ fontSize: 'inherit' }}>{exp.position} — {exp.company}</strong>
                                        <span style={{ fontSize: 'inherit', color: '#000000' }}>{normalizeAtsDate(exp.startDate)} – {exp.current ? currentLabel : exp.endDate}</span>
                                    </div>
                                    <p style={{ fontSize: 'inherit', color: '#000000', marginBottom: '3px' }}>{exp.location}</p>
                                    <p style={{ fontSize: 'inherit', color: '#000000', whiteSpace: 'pre-line', lineHeight: style.lineHeight }}>{exp.description}</p>
                                </div>
                            ))}
                        </section>
                    );
                }

                if (section.id === 'education' && education.length > 0) {
                    return (
                        <section key={section.id} style={sectionStyle}>
                            <h2 style={headingStyle}>{section.title}</h2>
                            {education.map(edu => (
                                <div key={edu.id} style={{ marginBottom: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <strong style={{ fontSize: 'inherit' }}>{edu.degree}</strong>
                                        <span style={{ fontSize: 'inherit', color: '#000000' }}>{normalizeAtsDate(edu.startDate)}{edu.current ? ` — ${getCurrentLabel(data?.language || 'pt')}` : edu.endDate && ` — ${normalizeAtsDate(edu.endDate)}`}</span>
                                    </div>
                                    <p style={{ fontSize: 'inherit', color: '#000000' }}>{edu.institution}</p>
                                </div>
                            ))}
                        </section>
                    );
                }

                if (section.id === 'skills' && skills.length > 0) {
                    const classified = classifySkills(skills);
                    const { hard, soft } = separateByType(classified);
                    const hardSkills = hard.flatMap(s => s.skills).filter(Boolean);
                    const softSkills = soft.flatMap(s => s.skills).filter(Boolean);
                    const hardLabel = data?.language === 'en' ? 'Hard Skills' : 'Hard Skills';
                    const softLabel = data?.language === 'en' ? 'Soft Skills' : 'Soft Skills';

                    return (
                        <section key={section.id} style={sectionStyle}>
                            <h2 style={headingStyle}>{section.title}</h2>
                            {hardSkills.length > 0 && (
                                <div style={{ marginBottom: '14px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <strong style={{ fontSize: 'inherit' }}>{hardLabel}</strong>
                                    </div>
                                    <p style={{ fontSize: 'inherit', color: '#000000', whiteSpace: 'pre-line', lineHeight: style.lineHeight }}>{hardSkills.map(stripEmojis).join(', ')}</p>
                                </div>
                            )}
                            {softSkills.length > 0 && (
                                <div style={{ marginBottom: '14px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <strong style={{ fontSize: 'inherit' }}>{softLabel}</strong>
                                    </div>
                                    <p style={{ fontSize: 'inherit', color: '#000000', whiteSpace: 'pre-line', lineHeight: style.lineHeight }}>{softSkills.map(stripEmojis).join(', ')}</p>
                                </div>
                            )}
                        </section>
                    );
                }

                if (section.type === 'TEXT') {
                    return (
                        <section key={section.id} style={sectionStyle}>
                            <h2 style={headingStyle}>{section.title}</h2>
                            <p style={{ fontSize: 'inherit', color: '#000000', lineHeight: style.lineHeight }}>{section.content}</p>
                        </section>
                    );
                }

                if (section.type === 'SIMPLE_LIST') {
                    const isCertSection = section.id === 'certifications';
                    return (
                        <section key={section.id} style={sectionStyle}>
                            <h2 style={headingStyle}>{section.title}</h2>
                            <ul style={{ fontSize: 'inherit', color: '#000000', paddingLeft: '14px', listStyleType: 'circle' }}>
                                {(section.items as any[] || []).map((item, idx) => (
                                    <li key={idx} style={{ marginBottom: '4px' }}>
                                        {isCertSection && item && typeof item === 'object' ? (
                                            <span><strong>{safeCertName(item)}</strong>{safeString(item.issuer) && <span> — {item.issuer}</span>}{safeString(item.date) && <span> ({normalizeAtsDate(item.date)})</span>}</span>
                                        ) : typeof item === 'object' && item !== null ? (
                                            <span><strong>{safeCertName(item)}</strong>{safeString(item.description) && <span> — {item.description}</span>}</span>
                                        ) : String(item)}
                                    </li>
                                ))}
                            </ul>
                        </section>
                    );
                }

                if (section.type === 'DATED_LIST') {
                    return (
                        <section key={section.id} style={sectionStyle}>
                            <h2 style={headingStyle}>{section.title}</h2>
                            {(section.items as any[] || []).map(item => (
                                <div key={item.id} style={{ marginBottom: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <strong style={{ fontSize: 'inherit' }}>{item.title}</strong>
                                        <span style={{ fontSize: 'inherit', color: '#000000' }}>{normalizeAtsDate(item.startDate)}{item.endDate && ` – ${normalizeAtsDate(item.endDate)}`}</span>
                                    </div>
                                    <p style={{ fontSize: 'inherit', color: '#000000' }}>{item.subtitle}</p>
                                    <p style={{ fontSize: 'inherit', color: '#000000', whiteSpace: 'pre-line', lineHeight: style.lineHeight }}>{item.description}</p>
                                </div>
                            ))}
                        </section>
                    );
                }

                return null;
            })}
        </div>
    );
}



// ─── TEMPLATE 5: Tech Dark Mode ──────────────────────────────────────────────
function TemplateTech({ data, currentLabel }: { data: ResumeData; currentLabel?: string }) {
    if (!data) return null;
    const { personalInfo = {} as PersonalInfo, summary, experiences = [], education = [], skills = [], appearance = {} as AppearanceSettings, sectionsConfig = [] } = data;
    const style = getStyles(appearance);

    const containerStyle = { ...style, backgroundColor: '#0F172A', color: '#94A3B8', padding: '40px', boxSizing: 'border-box' as const };
    const headingStyle = { fontSize: 'inherit', fontWeight: 900, color: '#F8FAFC', marginBottom: '8px', marginTop: '16px' };
    const blueText = { color: '#3B82F6' };

    return (
        <div className="resume-container" style={containerStyle}>
            <div style={{ marginBottom: '5mm' }}>
                <h1 style={{ fontSize: 'inherit', fontWeight: 900, ...blueText, marginBottom: '4px' }}>{personalInfo.fullName || 'SEU NOME'}</h1>
                <p style={{ fontSize: 'inherit', color: '#94A3B8' }}>
                    {[
                        personalInfo.email,
                        personalInfo.phone,
                        personalInfo.location,
                        personalInfo.linkedin && typeof personalInfo.linkedin === 'string' && `in/${personalInfo.linkedin.replace('https://linkedin.com/in/', '')}`,
                        personalInfo.github && typeof personalInfo.github === 'string' && `gh/${personalInfo.github.replace('https://github.com/', '')}`,
                        personalInfo.portfolio
                    ].filter(Boolean).join(' // ')}
                </p>
            </div>

            {(sectionsConfig || []).filter(s => s.active && s.id !== 'personal').map(section => {
                if (section.id === 'summary' && summary) {
                    return (
                        <div key={section.id} style={{ marginBottom: SECTION_MARGIN_BOTTOM }}>
                            <h2 style={headingStyle}>~/{section.id}</h2>
                            <p style={{ fontSize: 'inherit', lineHeight: style.lineHeight, whiteSpace: 'pre-line' }}>{summary}</p>
                        </div>
                    );
                }

                if (section.id === 'experience' && experiences.length > 0) {
                    return (
                        <div key={section.id} style={{ marginBottom: '16px' }}>
                            <h2 style={headingStyle}>~/{section.id}</h2>
                            {experiences.map(exp => (
                                <div key={exp.id} style={{ marginBottom: '12px' }}>
                                    <strong style={{ fontSize: 'inherit', fontWeight: 700, ...blueText }}>
                                        {exp.position} - {exp.company}
                                    </strong>
                                    <p style={{ fontSize: 'inherit', color: '#000000', marginTop: '2px', marginBottom: '4px' }}>
                                        &gt; {exp.location ? `${exp.location} // ` : ''}{normalizeAtsDate(exp.startDate)} - {exp.current ? currentLabel : exp.endDate}
                                    </p>
                                    <p style={{ fontSize: 'inherit', whiteSpace: 'pre-line', lineHeight: style.lineHeight }}>{exp.description}</p>
                                </div>
                            ))}
                        </div>
                    );
                }

                if (section.id === 'education' && education.length > 0) {
                    return (
                        <div key={section.id} style={{ marginBottom: '16px' }}>
                            <h2 style={headingStyle}>~/{section.id}</h2>
                            {education.map(edu => (
                                <div key={edu.id} style={{ marginBottom: '8px' }}>
                                    <strong style={{ fontSize: 'inherit', fontWeight: 700, ...blueText }}>
                                        {edu.degree} - {edu.institution}
                                    </strong>
                                    <p style={{ fontSize: 'inherit', color: '#000000', marginTop: '2px' }}>
                                        &gt; {edu.location ? `${edu.location} // ` : ''}{normalizeAtsDate(edu.startDate)}{edu.current ? ` - ${getCurrentLabel(data?.language || 'pt')}` : ` - ${normalizeAtsDate(edu.endDate)}`}
                                    </p>
                                </div>
                            ))}
                        </div>
                    );
                }

                if (section.id === 'skills' && skills.length > 0) {
                    const classified = classifySkills(skills);
                    const { hard, soft } = separateByType(classified);
                    const hardSkills = hard.flatMap(s => s.skills).filter(Boolean);
                    const softSkills = soft.flatMap(s => s.skills).filter(Boolean);
                    const hardLabel = data?.language === 'en' ? 'Hard Skills' : 'Hard Skills';
                    const softLabel = data?.language === 'en' ? 'Soft Skills' : 'Soft Skills';

                    return (
                        <div key={section.id} style={{ marginBottom: '16px' }}>
                            <h2 style={headingStyle}>~/{section.id}</h2>
                            {hardSkills.length > 0 && (
                                <div style={{ marginBottom: '12px' }}>
                                    <strong style={{ fontSize: 'inherit', fontWeight: 700, ...blueText }}>{hardLabel}</strong>
                                    <p style={{ fontSize: 'inherit', whiteSpace: 'pre-line', lineHeight: style.lineHeight }}>{hardSkills.map(stripEmojis).join(', ')}</p>
                                </div>
                            )}
                            {softSkills.length > 0 && (
                                <div style={{ marginBottom: '12px' }}>
                                    <strong style={{ fontSize: 'inherit', fontWeight: 700, ...blueText }}>{softLabel}</strong>
                                    <p style={{ fontSize: 'inherit', whiteSpace: 'pre-line', lineHeight: style.lineHeight }}>{softSkills.map(stripEmojis).join(', ')}</p>
                                </div>
                            )}
                        </div>
                    );
                }

                if (section.type === 'SIMPLE_LIST' && section.items && section.items.length > 0) {
                    const isCertSection = section.id === 'certifications';
                    return (
                        <div key={section.id} style={{ marginBottom: '16px' }}>
                            <h2 style={headingStyle}>~/{section.id}</h2>
                            <ul style={{ margin: 0, paddingLeft: LIST_PADDING_LEFT, fontSize: 'inherit' }}>
                                {(section.items as any[]).map((item, i) => (
                                    <li key={i} style={{ marginBottom: '2px' }}>
                                        {isCertSection && item && typeof item === 'object' ? (
                                            <span><strong>{safeCertName(item)}</strong>{safeString(item.issuer) && <span> — {item.issuer}</span>}{safeString(item.date) && <span> ({normalizeAtsDate(item.date)})</span>}</span>
                                        ) : typeof item === 'object' && item !== null ? (
                                            <span><strong>{safeCertName(item)}</strong>{safeString(item.description) && <span> — {item.description}</span>}</span>
                                        ) : String(item)}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    );
                }

                if (section.type === 'DATED_LIST' && section.items && section.items.length > 0) {
                    return (
                        <div key={section.id} style={{ marginBottom: '16px' }}>
                            <h2 style={headingStyle}>~/{section.id}</h2>
                            {(section.items as any[]).map(item => (
                                <div key={item.id} style={{ marginBottom: '12px' }}>
                                    <strong style={{ fontSize: 'inherit', fontWeight: 700, ...blueText }}>
                                        {item.title} {item.subtitle ? `@ ${item.subtitle}` : ''}
                                    </strong>
                                    <p style={{ fontSize: 'inherit', color: '#000000', marginTop: '2px', marginBottom: '4px' }}>
                                        &gt; {item.location ? `${item.location} // ` : ''}{normalizeAtsDate(item.startDate)}{item.endDate ? ` - ${normalizeAtsDate(item.endDate)}` : ''}
                                    </p>
                                    <p style={{ fontSize: 'inherit', whiteSpace: 'pre-line', lineHeight: style.lineHeight }}>{item.description}</p>
                                </div>
                            ))}
                        </div>
                    );
                }

                if (section.type === 'TEXT' && section.content) {
                    return (
                        <div key={section.id} style={{ marginBottom: '16px' }}>
                            <h2 style={headingStyle}>~/{section.id}</h2>
                            <p style={{ fontSize: 'inherit', whiteSpace: 'pre-wrap' }}>{section.content}</p>
                        </div>
                    );
                }

                return null;
            })}
        </div>
    );
}

// ─── TEMPLATE 6: Compact High-Density ─────────────────────────────────────────
function TemplateCompact({ data, currentLabel }: { data: ResumeData; currentLabel?: string }) {
    if (!data) return null;
    const { personalInfo = {} as PersonalInfo, summary, experiences = [], education = [], skills = [], appearance = {} as AppearanceSettings, sectionsConfig = [] } = data;
    const style = getStyles(appearance);

    const containerStyle = { ...style, padding: '15mm', backgroundColor: 'white', boxSizing: 'border-box' as const };
    const headerBox = { backgroundColor: '#F8FAFC', padding: '12px 16px', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5mm' };
    const headingStyle = { fontSize: 'inherit', fontWeight: 900, color: '#000000', textTransform: 'uppercase' as const, marginBottom: '6px', marginTop: '12px', borderBottom: '1px solid #000000', paddingBottom: '2px' };

    return (
        <div className="resume-container" style={containerStyle}>
            <div style={headerBox}>
                <div>
                    <h1 style={{ fontSize: 'inherit', fontWeight: 900, color: '#000000', margin: 0 }}>{personalInfo.fullName || 'SEU NOME'}</h1>
                    {personalInfo.title && <p style={{ fontSize: 'inherit', color: '#000000', margin: '2px 0 0 0', fontWeight: 600 }}>{personalInfo.title}</p>}
                </div>
                <div style={{ textAlign: 'right', fontSize: 'inherit', color: '#000000' }}>
                    {[
                        personalInfo.email,
                        personalInfo.phone,
                        personalInfo.location,
                        personalInfo.linkedin,
                        personalInfo.github,
                        personalInfo.portfolio
                    ].filter(Boolean).map((text, i) => (
                        <div key={i}>{text}</div>
                    ))}
                </div>
            </div>

            {(sectionsConfig || []).filter(s => s.active && s.id !== 'personal').map(section => {
                if (section.id === 'summary' && summary) {
                    return (
                        <div key={section.id}>
                            <h2 style={headingStyle}>{section.title}</h2>
                            <p style={{ fontSize: 'inherit', color: '#000000', textAlign: 'justify', whiteSpace: 'pre-line', lineHeight: style.lineHeight }}>{summary}</p>
                        </div>
                    );
                }

                if (section.id === 'experience' && experiences.length > 0) {
                    return (
                        <div key={section.id}>
                            <h2 style={headingStyle}>{section.title}</h2>
                            {experiences.map(exp => (
                                <div key={exp.id} style={{ marginBottom: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <strong style={{ fontSize: 'inherit', color: '#000000' }}>{exp.position} — {exp.company}</strong>
                                        <span style={{ fontSize: 'inherit', color: '#000000' }}>{normalizeAtsDate(exp.startDate)} - {exp.current ? currentLabel : exp.endDate}</span>
                                    </div>
                                    <p style={{ fontSize: 'inherit', color: '#000000', whiteSpace: 'pre-line', marginTop: '2px', lineHeight: style.lineHeight }}>{exp.description}</p>
                                </div>
                            ))}
                        </div>
                    );
                }

                if (section.id === 'education' && education.length > 0) {
                    return (
                        <div key={section.id}>
                            <h2 style={headingStyle}>{section.title}</h2>
                            {education.map(edu => (
                                <div key={edu.id} style={{ marginBottom: '6px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <strong style={{ fontSize: 'inherit', color: '#000000' }}>{edu.degree} - {edu.institution}</strong>
                                        <span style={{ fontSize: 'inherit', color: '#000000' }}>{normalizeAtsDate(edu.startDate)}{edu.current ? ` - ${getCurrentLabel(data?.language || 'pt')}` : ` - ${normalizeAtsDate(edu.endDate)}`}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    );
                }

                if (section.id === 'skills' && skills.length > 0) {
                    const classified = classifySkills(skills);
                    const { hard, soft } = separateByType(classified);
                    const hardSkills = hard.flatMap(s => s.skills).filter(Boolean);
                    const softSkills = soft.flatMap(s => s.skills).filter(Boolean);
                    const hardLabel = data?.language === 'en' ? 'Hard Skills' : 'Hard Skills';
                    const softLabel = data?.language === 'en' ? 'Soft Skills' : 'Soft Skills';

                    return (
                        <div key={section.id}>
                            <h2 style={headingStyle}>{section.title}</h2>
                            {hardSkills.length > 0 && (
                                <div style={{ marginBottom: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <strong style={{ fontSize: 'inherit', color: '#000000' }}>{hardLabel}</strong>
                                    </div>
                                    <p style={{ fontSize: 'inherit', color: '#000000', whiteSpace: 'pre-line', marginTop: '2px', lineHeight: style.lineHeight }}>{hardSkills.map(stripEmojis).join(', ')}</p>
                                </div>
                            )}
                            {softSkills.length > 0 && (
                                <div style={{ marginBottom: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <strong style={{ fontSize: 'inherit', color: '#000000' }}>{softLabel}</strong>
                                    </div>
                                    <p style={{ fontSize: 'inherit', color: '#000000', whiteSpace: 'pre-line', marginTop: '2px', lineHeight: style.lineHeight }}>{softSkills.map(stripEmojis).join(', ')}</p>
                                </div>
                            )}
                        </div>
                    );
                }

                if (section.type === 'SIMPLE_LIST' && section.items && section.items.length > 0) {
                    const isCertSection = section.id === 'certifications';
                    return (
                        <div key={section.id}>
                            <h2 style={headingStyle}>{section.title}</h2>
                            <ul style={{ margin: 0, paddingLeft: LIST_PADDING_LEFT, fontSize: 'inherit', color: '#000000' }}>
                                {(section.items as any[]).map((item, i) => (
                                    <li key={i} style={{ marginBottom: '2px' }}>
                                        {isCertSection && item && typeof item === 'object' && item !== null ? (
                                            <span><strong>{safeCertName(item)}</strong>{safeString(item.issuer) && <span> — {item.issuer}</span>}{safeString(item.date) && <span> ({normalizeAtsDate(item.date)})</span>}</span>
                                        ) : typeof item === 'object' ? (
                                            <span><strong>{safeCertName(item)}</strong>{safeString(item.description) && <span> — {item.description}</span>}</span>
                                        ) : String(item)}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    );
                }

                if (section.type === 'DATED_LIST' && section.items && section.items.length > 0) {
                    return (
                        <div key={section.id}>
                            <h2 style={headingStyle}>{section.title}</h2>
                            {(section.items as any[]).map(item => (
                                <div key={item.id} style={{ marginBottom: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <strong style={{ fontSize: 'inherit', color: '#000000' }}>{item.title} {item.subtitle ? `— ${item.subtitle}` : ''}</strong>
                                        <span style={{ fontSize: 'inherit', color: '#000000' }}>{normalizeAtsDate(item.startDate)}{item.endDate ? ` - ${normalizeAtsDate(item.endDate)}` : ''}</span>
                                    </div>
                                    <p style={{ fontSize: 'inherit', color: '#000000', whiteSpace: 'pre-line', marginTop: '2px', lineHeight: style.lineHeight }}>{item.description}</p>
                                </div>
                            ))}
                        </div>
                    );
                }

                if (section.type === 'TEXT' && section.content) {
                    return (
                        <div key={section.id}>
                            <h2 style={headingStyle}>{section.title}</h2>
                            <p style={{ fontSize: 'inherit', color: '#000000', whiteSpace: 'pre-wrap' }}>{section.content}</p>
                        </div>
                    );
                }

                return null;
            })}
        </div>
    );
}
// ─── TEMPLATE 7: Harvard Strict ATS ─────────────────────────────────────────────
function TemplateHarvard({ data, currentLabel }: { data: ResumeData; currentLabel?: string }) {
    if (!data) return null;
    const { personalInfo = {} as PersonalInfo, summary, experiences = [], education = [], skills = [], appearance = {} as AppearanceSettings, sectionsConfig = [] } = data;
    const style = getStyles(appearance);

    return (
        <div className="resume-container" style={{ ...style, background: 'white', color: '#000000', padding: '15mm', boxSizing: 'border-box', fontFamily: style.fontFamily }}>
            <header style={{ textAlign: 'center', marginBottom: '16px' }}>
                <h1 style={{ fontSize: 'inherit', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>
                    {personalInfo.fullName || 'SEU NOME'}
                </h1>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px', fontSize: 'inherit', color: '#000000' }}>
                    {personalInfo.email && <span>{personalInfo.email}</span>}
                    {personalInfo.phone && <span>• {personalInfo.phone}</span>}
                    {personalInfo.location && <span>• {personalInfo.location}</span>}
                    {personalInfo.linkedin && <span>• {personalInfo.linkedin}</span>}
                    {personalInfo.github && <span>• {personalInfo.github}</span>}
                    {personalInfo.portfolio && <span>• {personalInfo.portfolio}</span>}
                </div>
            </header>

            {(sectionsConfig || []).filter(s => s.active && s.id !== 'personal').map(section => {
                if (section.id === 'summary' && summary) {
                    return (
                        <section key={section.id} style={{ marginBottom: '16px' }}>
                            <h2 style={{ fontSize: 'inherit', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '1px solid #000', paddingBottom: '2px', marginBottom: '8px' }}>
                                {section.title}
                            </h2>
                            <p style={{ fontSize: 'inherit', textAlign: 'justify', whiteSpace: 'pre-line', lineHeight: style.lineHeight }}>{summary}</p>
                        </section>
                    );
                }

                if (section.id === 'experience' && experiences.length > 0) {
                    return (
                        <section key={section.id} style={{ marginBottom: '16px' }}>
                            <h2 style={{ fontSize: 'inherit', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '1px solid #000', paddingBottom: '2px', marginBottom: '12px' }}>
                                {section.title}
                            </h2>
                            {experiences.map(exp => (
                                <div key={exp.id} style={{ marginBottom: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontWeight: 'bold' }}>
                                        <span>{exp.position}</span>
                                        <span style={{ fontSize: 'inherit', fontWeight: 'normal' }}>
                                                                                        {normalizeAtsDate(exp.startDate)} — {exp.current ? getCurrentLabel('pt') : exp.endDate}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontStyle: 'italic', marginBottom: '4px' }}>
                                        <span>{exp.company}</span>
                                        <span style={{ fontSize: 'inherit' }}>{exp.location}</span>
                                    </div>
                                    <div style={{ fontSize: 'inherit', whiteSpace: 'pre-line', paddingLeft: '12px' }}>
                                        {(typeof exp.description === 'string' ? exp.description : String(exp.description || '')).split('\n').map((line, i) => {
                                            const trimmed = line.trim();
                                            if (!trimmed) return null;
                                            return trimmed.startsWith('•') || trimmed.startsWith('-') ? (
                                                <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '2px' }}>
                                                    <span>•</span>
                                                    <span>{trimmed.substring(1).trim()}</span>
                                                </div>
                                            ) : (
                                                <div key={i} style={{ marginBottom: '2px' }}>{trimmed}</div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </section>
                    );
                }

                if (section.id === 'education' && education.length > 0) {
                    return (
                        <section key={section.id} style={{ marginBottom: '16px' }}>
                            <h2 style={{ fontSize: 'inherit', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '1px solid #000', paddingBottom: '2px', marginBottom: '12px' }}>
                                {section.title}
                            </h2>
                            {education.map(edu => (
                                <div key={edu.id} style={{ marginBottom: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontWeight: 'bold' }}>
                                        <span>{edu.institution}</span>
                                        <span style={{ fontSize: 'inherit', fontWeight: 'normal' }}>{edu.location}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                        <span style={{ fontStyle: 'italic' }}>{edu.degree}</span>
                                        <span style={{ fontSize: 'inherit' }}>{normalizeAtsDate(edu.startDate)}{edu.current ? ` — ${getCurrentLabel(data?.language || 'pt')}` : edu.endDate && ` — ${normalizeAtsDate(edu.endDate)}`}</span>
                                    </div>
                                </div>
                            ))}
                        </section>
                    );
                }

                if (section.id === 'skills' && skills.length > 0) {
                    const classified = classifySkills(skills);
                    const { hard, soft } = separateByType(classified);
                    const hardSkills = hard.flatMap(s => s.skills).filter(Boolean);
                    const softSkills = soft.flatMap(s => s.skills).filter(Boolean);
                    const hardLabel = data?.language === 'en' ? 'Hard Skills' : 'Hard Skills';
                    const softLabel = data?.language === 'en' ? 'Soft Skills' : 'Soft Skills';

                    return (
                        <section key={section.id} style={{ marginBottom: '16px' }}>
                            <h2 style={{ fontSize: 'inherit', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '1px solid #000', paddingBottom: '2px', marginBottom: '8px' }}>
                                {section.title}
                            </h2>
                            {hardSkills.length > 0 && (
                                <div style={{ marginBottom: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontWeight: 'bold' }}>
                                        <span>{hardLabel}</span>
                                    </div>
                                    <div style={{ fontSize: 'inherit', whiteSpace: 'pre-line', paddingLeft: '12px' }}>
                                        {hardSkills.map(stripEmojis).join(', ')}
                                    </div>
                                </div>
                            )}
                            {softSkills.length > 0 && (
                                <div style={{ marginBottom: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontWeight: 'bold' }}>
                                        <span>{softLabel}</span>
                                    </div>
                                    <div style={{ fontSize: 'inherit', whiteSpace: 'pre-line', paddingLeft: '12px' }}>
                                        {softSkills.map(stripEmojis).join(', ')}
                                    </div>
                                </div>
                            )}
                        </section>
                    );
                }

                // Generic text/lists for ATS strict parsing
                if (section.type === 'TEXT' && section.content) {
                    return (
                        <section key={section.id} style={{ marginBottom: '16px' }}>
                            <h2 style={{ fontSize: 'inherit', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '1px solid #000', paddingBottom: '2px', marginBottom: '8px' }}>{section.title}</h2>
                            <div style={{ fontSize: 'inherit', whiteSpace: 'pre-line', lineHeight: style.lineHeight }}>{section.content}</div>
                        </section>
                    );
                }

                if (section.type === 'SIMPLE_LIST' && section.items && section.items.length > 0) {
                    const isCertSection = section.id === 'certifications';
                    return (
                        <section key={section.id} style={{ marginBottom: '16px' }}>
                            <h2 style={{ fontSize: 'inherit', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '1px solid #000', paddingBottom: '2px', marginBottom: '8px' }}>{section.title}</h2>
                            <ul style={{ fontSize: 'inherit', margin: 0, paddingLeft: LIST_PADDING_LEFT }}>
                                {(section.items as any[]).map((item, i) => (
                                    <li key={i} style={{ marginBottom: '4px' }}>
                                        {isCertSection && item && typeof item === 'object' ? (
                                            <span><strong>{safeCertName(item)}</strong>{safeString(item.issuer) && <span> — {item.issuer}</span>}{safeString(item.date) && <span> ({normalizeAtsDate(item.date)})</span>}</span>
                                        ) : typeof item === 'object' && item !== null ? (
                                            <span><strong>{safeCertName(item)}</strong>{safeString(item.description) && <span> — {item.description}</span>}</span>
                                        ) : String(item)}
                                    </li>
                                ))}
                            </ul>
                        </section>
                    );
                }

                return null;
            })}
        </div>
    );
}

// ─── TEMPLATE 8: Corporate Standard ─────────────────────────────────────────────
function TemplateCorporate({ data, currentLabel }: { data: ResumeData; currentLabel?: string }) {
    if (!data) return null;
    const { personalInfo = {} as PersonalInfo, summary, experiences = [], education = [], skills = [], appearance = {} as AppearanceSettings, sectionsConfig = [] } = data;
    const style = getStyles(appearance);

    return (
        <div className="resume-container" style={{ ...style, background: 'white', color: '#000000', padding: '15mm', boxSizing: 'border-box' }}>
            <header style={{ marginBottom: SECTION_MARGIN_BOTTOM }}>
                <h1 style={{ fontSize: 'inherit', fontWeight: 800, color: '#000000', margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>
                    {personalInfo.fullName || 'SEU NOME'}
                </h1>
                <p style={{ fontSize: 'inherit', color: '#4b5563', margin: '0 0 12px 0', fontWeight: 500 }}>
                    {personalInfo.title || 'SEU CARGO'}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: 'inherit', color: '#4b5563' }}>
                    {personalInfo.email && <span>{personalInfo.email}</span>}
                    {personalInfo.phone && <span>• {personalInfo.phone}</span>}
                    {personalInfo.location && <span>• {personalInfo.location}</span>}
                    {personalInfo.linkedin && <span>• {personalInfo.linkedin}</span>}
                    {personalInfo.github && <span>• {personalInfo.github}</span>}
                    {personalInfo.portfolio && <span>• {personalInfo.portfolio}</span>}
                </div>
            </header>

            {(sectionsConfig || []).filter(s => s.active && s.id !== 'personal').map(section => {
                if (section.id === 'summary' && summary) {
                    return (
                        <section key={section.id} style={{ marginBottom: SECTION_MARGIN_BOTTOM }}>
                            <h2 style={{ fontSize: 'inherit', fontWeight: 800, textTransform: 'uppercase', color: '#000000', marginBottom: '8px' }}>
                                {section.title}
                            </h2>
                            <p style={{ fontSize: 'inherit', color: '#000000', lineHeight: style.lineHeight, whiteSpace: 'pre-line' }}>{summary}</p>
                        </section>
                    );
                }

                if (section.id === 'experience' && experiences.length > 0) {
                    return (
                        <section key={section.id} style={{ marginBottom: SECTION_MARGIN_BOTTOM }}>
                            <h2 style={{ fontSize: 'inherit', fontWeight: 800, textTransform: 'uppercase', color: '#000000', marginBottom: '12px' }}>
                                {section.title}
                            </h2>
                            {experiences.map(exp => (
                                <div key={exp.id} style={{ marginBottom: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
                                        <div>
                                            <strong style={{ color: '#000000', fontSize: 'inherit' }}>{exp.position}</strong>
                                            <span style={{ margin: '0 8px', color: '#000000' }}>|</span>
                                            <span style={{ color: '#4b5563', fontWeight: 500 }}>{exp.company}</span>
                                        </div>
                                        <span style={{ fontSize: 'inherit', color: '#000000', whiteSpace: 'nowrap' }}>
                                                                                        {normalizeAtsDate(exp.startDate)} — {exp.current ? getCurrentLabel('pt') : exp.endDate}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: 'inherit', color: '#4b5563', whiteSpace: 'pre-line', marginTop: '6px', lineHeight: style.lineHeight }}>
                                        {(typeof exp.description === 'string' ? exp.description : String(exp.description || '')).split('\n').map((line, i) => {
                                            const trimmed = line.trim();
                                            if (!trimmed) return null;
                                            return trimmed.startsWith('•') || trimmed.startsWith('-') ? (
                                                <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
                                                    <span style={{ color: '#000000' }}>•</span>
                                                    <span>{trimmed.substring(1).trim()}</span>
                                                </div>
                                            ) : (
                                                <div key={i} style={{ marginBottom: '4px' }}>{trimmed}</div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </section>
                    );
                }

                if (section.id === 'education' && education.length > 0) {
                    return (
                        <section key={section.id} style={{ marginBottom: SECTION_MARGIN_BOTTOM }}>
                            <h2 style={{ fontSize: 'inherit', fontWeight: 800, textTransform: 'uppercase', color: '#000000', marginBottom: '12px' }}>
                                {section.title}
                            </h2>
                            {education.map(edu => (
                                <div key={edu.id} style={{ marginBottom: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <strong style={{ color: '#000000', fontSize: 'inherit' }}>{edu.degree}</strong>
                                            <div style={{ color: '#4b5563', fontSize: 'inherit', marginTop: '2px' }}>{edu.institution}{edu.location && `, ${edu.location}`}</div>
                                        </div>
                                        <span style={{ fontSize: 'inherit', color: '#000000', whiteSpace: 'nowrap' }}>
                                            {normalizeAtsDate(edu.startDate)}{edu.current ? ` — ${getCurrentLabel(data?.language || 'pt')}` : edu.endDate && ` — ${normalizeAtsDate(edu.endDate)}`}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </section>
                    );
                }

                if (section.id === 'skills' && skills.length > 0) {
                    const classified = classifySkills(skills);
                    const { hard, soft } = separateByType(classified);
                    const hardSkills = hard.flatMap(s => s.skills).filter(Boolean);
                    const softSkills = soft.flatMap(s => s.skills).filter(Boolean);
                    const hardLabel = data?.language === 'en' ? 'Hard Skills' : 'Hard Skills';
                    const softLabel = data?.language === 'en' ? 'Soft Skills' : 'Soft Skills';

                    return (
                        <section key={section.id} style={{ marginBottom: SECTION_MARGIN_BOTTOM }}>
                            <h2 style={{ fontSize: 'inherit', fontWeight: 800, textTransform: 'uppercase', color: '#000000', marginBottom: '8px' }}>
                                {section.title}
                            </h2>
                            {hardSkills.length > 0 && (
                                <div style={{ marginBottom: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
                                        <div>
                                            <strong style={{ color: '#000000', fontSize: 'inherit' }}>{hardLabel}</strong>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: 'inherit', color: '#4b5563', whiteSpace: 'pre-line', marginTop: '6px', lineHeight: style.lineHeight }}>
                                        {hardSkills.map(stripEmojis).join(', ')}
                                    </div>
                                </div>
                            )}
                            {softSkills.length > 0 && (
                                <div style={{ marginBottom: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
                                        <div>
                                            <strong style={{ color: '#000000', fontSize: 'inherit' }}>{softLabel}</strong>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: 'inherit', color: '#4b5563', whiteSpace: 'pre-line', marginTop: '6px', lineHeight: style.lineHeight }}>
                                        {softSkills.map(stripEmojis).join(', ')}
                                    </div>
                                </div>
                            )}
                        </section>
                    );
                }

                // Default renders
                if (section.type === 'TEXT' && section.content) {
                    return (
                        <section key={section.id} style={{ marginBottom: SECTION_MARGIN_BOTTOM }}>
                            <h2 style={{ fontSize: 'inherit', fontWeight: 800, textTransform: 'uppercase', color: '#000000', marginBottom: '8px' }}>{section.title}</h2>
                            <p style={{ fontSize: 'inherit', color: '#000000', whiteSpace: 'pre-line', lineHeight: style.lineHeight }}>{section.content}</p>
                        </section>
                    );
                }

                if (section.type === 'SIMPLE_LIST' && section.items && section.items.length > 0) {
                    const isCertSection = section.id === 'certifications';
                    return (
                        <section key={section.id} style={{ marginBottom: SECTION_MARGIN_BOTTOM }}>
                            <h2 style={{ fontSize: 'inherit', fontWeight: 800, textTransform: 'uppercase', color: '#000000', marginBottom: '8px' }}>{section.title}</h2>
                            <ul style={{ fontSize: 'inherit', margin: 0, paddingLeft: LIST_PADDING_LEFT, color: '#000000' }}>
                                {section.items.map((item: any, i: number) => (
                                    <li key={i} style={{ marginBottom: '4px' }}>
                                        {isCertSection && item && typeof item === 'object' ? (
                                            <span>
                                                <strong>{safeCertName(item)}</strong>
                                                {safeString(item.issuer) && <span> — {item.issuer}</span>}
                                                {safeString(item.date) && <span> ({normalizeAtsDate(item.date)})</span>}
                                            </span>
                                        ) : typeof item === 'object' && item !== null ? (
                                            <span>
                                                <strong>{safeCertName(item)}</strong>
                                                {safeString(item.description) && <span> — {item.description}</span>}
                                            </span>
                                        ) : (
                                            String(item)
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </section>
                    );
                }

                return null;
            })}
        </div>
    );
}

// ─── TEMPLATE 9: ATS Optimal Max ────────────────────────────────────────────────
function TemplateATSOptimal({ data, currentLabel }: { data: ResumeData; currentLabel?: string }) {
    if (!data) return null;
    const { personalInfo = {} as PersonalInfo, summary, experiences = [], education = [], skills = [], appearance = {} as AppearanceSettings, sectionsConfig = [] } = data;
    const style = getStyles(appearance);

    return (
        <div className="resume-container" style={{ ...style, background: 'white', color: 'black', padding: '15mm', boxSizing: 'border-box' }}>
            <div style={{ textAlign: 'center', marginBottom: SECTION_MARGIN_BOTTOM }}>
                <h1 style={{ fontSize: 'inherit', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>
                    {stripEmojis(personalInfo.fullName) || 'SEU NOME'}
                </h1>
                <div style={{ fontSize: 'inherit', color: 'black', lineHeight: style.lineHeight }}>
                    {personalInfo.email && <div>{stripEmojis(`Email: ${personalInfo.email}`)}</div>}
                    {personalInfo.phone && <div>{stripEmojis(`Phone: ${personalInfo.phone}`)}</div>}
                    {personalInfo.location && <div>{stripEmojis(personalInfo.location)}</div>}
                    {personalInfo.linkedin && <div>{stripEmojis(`LinkedIn: ${personalInfo.linkedin}`)}</div>}
                    {personalInfo.github && <div>{stripEmojis(`GitHub: ${personalInfo.github}`)}</div>}
                    {personalInfo.portfolio && <div>{stripEmojis(`Portfolio: ${personalInfo.portfolio}`)}</div>}
                </div>
            </div>

            {(sectionsConfig || []).filter(s => s.active && s.id !== 'personal').map(section => {
                if (section.id === 'summary' && summary) {
                    return (
                        <div key={section.id} style={{ marginBottom: '16px' }}>
                            <h2 style={{ fontSize: 'inherit', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '1px solid black', paddingBottom: '2px', marginBottom: '8px' }}>
                                {stripEmojis(section.title)}
                            </h2>
                            <p style={{ fontSize: 'inherit', textAlign: 'justify', whiteSpace: 'pre-line', margin: 0, lineHeight: style.lineHeight }}>
                                {stripEmojis(summary)}
                            </p>
                        </div>
                    );
                }

                if (section.id === 'experience' && experiences.length > 0) {
                    return (
                        <div key={section.id} style={{ marginBottom: '16px' }}>
                            <h2 style={{ fontSize: 'inherit', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '1px solid black', paddingBottom: '2px', marginBottom: '12px' }}>
                                {stripEmojis(section.title)}
                            </h2>
                            {experiences.map(exp => (
                                <div key={exp.id} style={{ marginBottom: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ fontWeight: 'bold' }}>{stripEmojis(exp.position)}</span>
                                        <span>
                                            {normalizeAtsDate(exp.startDate)} - {exp.current ? currentLabel : exp.endDate}
                                        </span>
                                    </div>
                                    <div style={{ fontStyle: 'italic', marginBottom: '4px' }}>
                                        {stripEmojis(exp.company)}{exp.location ? `, ${stripEmojis(exp.location)}` : ''}
                                    </div>
                                    <ul style={{ margin: '4px 0 0 0', paddingLeft: LIST_PADDING_LEFT, fontSize: 'inherit' }}>
                                        {stripEmojis(typeof exp.description === 'string' ? exp.description : String(exp.description || '')).split('\n').map((line, i) => {
                                            const trimmed = typeof line === 'string' ? line.trim().replace(/^[-•]\s*/, '') : '';
                                            if (!trimmed) return null;
                                            return (
                                                <li key={i} style={{ marginBottom: '2px' }}>{trimmed}</li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    );
                }

                if (section.id === 'education' && education.length > 0) {
                    return (
                        <div key={section.id} style={{ marginBottom: '16px' }}>
                            <h2 style={{ fontSize: 'inherit', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '1px solid black', paddingBottom: '2px', marginBottom: '12px' }}>
                                {stripEmojis(section.title)}
                            </h2>
                            {education.map(edu => (
                                <div key={edu.id} style={{ marginBottom: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ fontWeight: 'bold' }}>{stripEmojis(edu.degree)}</span>
                                        <span>{normalizeAtsDate(edu.startDate)}{edu.current ? ` - ${getCurrentLabel(data?.language || 'pt')}` : edu.endDate && ` - ${normalizeAtsDate(edu.endDate)}`}</span>
                                    </div>
                                    <div>
                                        {stripEmojis(edu.institution)}{edu.location ? `, ${stripEmojis(edu.location)}` : ''}
                                    </div>
                                </div>
                            ))}
                        </div>
                    );
                }

                if (section.id === 'skills' && skills.length > 0) {
                    const classified = classifySkills(skills);
                    const { hard, soft } = separateByType(classified);
                    const hardSkills = hard.flatMap(s => s.skills).filter(Boolean);
                    const softSkills = soft.flatMap(s => s.skills).filter(Boolean);
                    const hardLabel = data?.language === 'en' ? 'Hard Skills' : 'Hard Skills';
                    const softLabel = data?.language === 'en' ? 'Soft Skills' : 'Soft Skills';

                    return (
                        <div key={section.id} style={{ marginBottom: '16px' }}>
                            <h2 style={{ fontSize: 'inherit', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '1px solid black', paddingBottom: '2px', marginBottom: '8px' }}>
                                {stripEmojis(section.title)}
                            </h2>
                            {hardSkills.length > 0 && (
                                <div style={{ marginBottom: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ fontWeight: 'bold' }}>{hardLabel}</span>
                                    </div>
                                    <div style={{ fontSize: 'inherit', whiteSpace: 'pre-line', margin: 0, lineHeight: style.lineHeight }}>
                                        {hardSkills.map(stripEmojis).join(', ')}
                                    </div>
                                </div>
                            )}
                            {softSkills.length > 0 && (
                                <div style={{ marginBottom: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ fontWeight: 'bold' }}>{softLabel}</span>
                                    </div>
                                    <div style={{ fontSize: 'inherit', whiteSpace: 'pre-line', margin: 0, lineHeight: style.lineHeight }}>
                                        {softSkills.map(stripEmojis).join(', ')}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                }

                // Generic text/lists
                if (section.type === 'TEXT' && section.content) {
                    return (
                        <div key={section.id} style={{ marginBottom: '16px' }}>
                            <h2 style={{ fontSize: 'inherit', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '1px solid black', paddingBottom: '2px', marginBottom: '8px' }}>{stripEmojis(section.title)}</h2>
                            <div style={{ fontSize: 'inherit', whiteSpace: 'pre-line', lineHeight: style.lineHeight }}>{stripEmojis(section.content)}</div>
                        </div>
                    );
                }

                if (section.type === 'SIMPLE_LIST' && section.items && section.items.length > 0) {
                    const isCertSection = section.id === 'certifications';
                    return (
                        <div key={section.id} style={{ marginBottom: '16px' }}>
                            <h2 style={{ fontSize: 'inherit', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '1px solid black', paddingBottom: '2px', marginBottom: '8px' }}>{stripEmojis(section.title)}</h2>
                            <ul style={{ fontSize: 'inherit', margin: 0, paddingLeft: LIST_PADDING_LEFT }}>
                                {(section.items as any[]).map((item, i) => (
                                    <li key={i} style={{ marginBottom: '4px' }}>
                                        {isCertSection && item && typeof item === 'object' ? (
                                            <span><strong>{stripEmojis(safeCertName(item))}</strong>{safeString(item.issuer) && <span> — {stripEmojis(item.issuer)}</span>}{safeString(item.date) && <span> ({normalizeAtsDate(item.date)})</span>}</span>
                                        ) : typeof item === 'object' && item !== null ? (
                                            <span><strong>{stripEmojis(safeCertName(item))}</strong>{safeString(item.description) && <span> — {stripEmojis(item.description)}</span>}</span>
                                        ) : stripEmojis(String(item))}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    );
                }

                if (section.type === 'DATED_LIST' && section.items && section.items.length > 0) {
                    return (
                        <div key={section.id} style={{ marginBottom: '16px' }}>
                            <h2 style={{ fontSize: 'inherit', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '1px solid black', paddingBottom: '2px', marginBottom: '12px' }}>
                                {stripEmojis(section.title)}
                            </h2>
                            {(section.items as any[]).map(item => (
                                <div key={item.id} style={{ marginBottom: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ fontWeight: 'bold' }}>{stripEmojis(item.title)}</span>
                                        <span>
                                            {normalizeAtsDate(item.startDate)}{item.endDate ? ` - ${normalizeAtsDate(item.endDate)}` : ''}
                                        </span>
                                    </div>
                                    {item.subtitle && (
                                        <div style={{ fontStyle: 'italic', marginBottom: '4px' }}>
                                            {stripEmojis(item.subtitle)}{item.location ? `, ${stripEmojis(item.location)}` : ''}
                                        </div>
                                    )}
                                    {item.description && (
                                        <ul style={{ margin: '4px 0 0 0', paddingLeft: LIST_PADDING_LEFT, fontSize: 'inherit' }}>
                                            {stripEmojis(typeof item.description === 'string' ? item.description : String(item.description || '')).split('\n').map((line: string, i: number) => {
                                                const trimmed = typeof line === 'string' ? line.trim().replace(/^[-•]\s*/, '') : '';
                                                if (!trimmed) return null;
                                                return <li key={i} style={{ marginBottom: '2px' }}>{trimmed}</li>;
                                            })}
                                        </ul>
                                    )}
                                </div>
                            ))}
                        </div>
                    );
                }

                return null;
            })}
        </div>
    );
}

export function ResumePreview({ data: explicitData, showPageBreaks = false }: { data?: any, showPageBreaks?: boolean }) {
    const storeData = useResumeStore(state => state.data);
    const data = explicitData || storeData;
    const size = PAGE_SIZES[(data?.appearance?.pageSize as keyof typeof PAGE_SIZES) || 'A4'] || PAGE_SIZES['A4'];
    const language = data?.language || 'pt';
    const { t } = useTranslation();
    
    const printFontFamily = FONT_MAP[data?.appearance?.fontFamily] || FONT_MAP['Arial'];
    const printFontSize = data?.appearance?.fontSize ? `${data.appearance.fontSize}pt` : '11pt';
    const printLineHeight = data?.appearance?.lineSpacing || '1.5';

    const renderTemplate = () => {
        switch (data.templateId) {
            case 'classic':
                return <TemplateClassic data={data} currentLabel={getCurrentLabel(language)} />;

            case 'modern':
                return <TemplateModern data={data} currentLabel={getCurrentLabel(language)} />;
            case 'tech':
                return <TemplateTech data={data} currentLabel={getCurrentLabel(language)} />;

            case 'minimalist':
                return <TemplateMinimalist data={data} currentLabel={getCurrentLabel(language)} />;
            case 'compact':
                return <TemplateCompact data={data} currentLabel={getCurrentLabel(language)} />;

            case 'executive':
                return <TemplateVienna data={data} currentLabel={getCurrentLabel(language)} />;

            case 'harvard':
                return <TemplateHarvard data={data} currentLabel={getCurrentLabel(language)} />;

            case 'corporate':
                return <TemplateCorporate data={data} currentLabel={getCurrentLabel(language)} />;

            case 'ats-optimal':
                return <TemplateATSOptimal data={data} currentLabel={getCurrentLabel(language)} />;

            default:
                return <TemplateClassic data={data} currentLabel={getCurrentLabel(language)} />;
        }
    };

    const printableWidth = `calc(${size.width} - 20mm)`;
    const printStyles = `
                @media print {
                    @page {
                        margin: 10mm;
                    }
                    html, body {
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    #resume-print-container {
                        transform: none !important;
                        width: ${printableWidth} !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        box-shadow: none !important;
                    }
                    .resume-container {
                        width: 100% !important;
                        min-height: auto !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        box-shadow: none !important;
                        font-family: ${printFontFamily} !important;
                        font-size: ${printFontSize} !important;
                        line-height: ${printLineHeight} !important;
                    }
                    .page-break-indicator { display: none !important; }
                }
                `;

    return (
        <div className="relative overflow-hidden resume-preview-wrapper">
            <style dangerouslySetInnerHTML={{ __html: printStyles + `
                .page-break-indicator {                    position: absolute;
                    left: 0;
                    right: 0;
                    height: 24px;
                    background-color: #f8fafc;
                    border-top: 1px solid #000000;
                    border-bottom: 1px solid #000000;
                    box-shadow: inset 0 4px 6px -1px rgb(0 0 0 / 0.05), inset 0 2px 4px -2px rgb(0 0 0 / 0.05);
                    z-index: 50;
                    pointer-events: none;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transform: translateY(-50%);
                }
                .page-break-label {
                    background: #cbd5e1;
                    color: #475569;
                    font-size: 9px;
                    font-weight: 800;
                    padding: 2px 8px;
                    border-radius: 4px;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                }
            `}} />
            
            {showPageBreaks && (
                <>
                    <div className="page-break-indicator" style={{ top: size.minHeight }}>
                        <span className="page-break-label">{t('editor.pageBreakEnd')} 1</span>
                    </div>
                    <div className="page-break-indicator" style={{ top: `calc(${size.minHeight} * 2)` }}>
                        <span className="page-break-label">{t('editor.pageBreakEnd')} 2</span>
                    </div>
                    <div className="page-break-indicator" style={{ top: `calc(${size.minHeight} * 3)` }}>
                        <span className="page-break-label">{t('editor.pageBreakEnd')} 3</span>
                    </div>
                </>
            )}

            {renderTemplate()}
            <PrintDisclaimer t={t} />
        </div>
    );
}
