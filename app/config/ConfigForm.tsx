'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAISettingsStore, AIProvider, AISettings } from '@/store/useAISettingsStore';
import { Settings, Play, CheckCircle, XCircle, RotateCcw, Brain, Zap, Key, Link2, Clock, Trash2, Save, Check, FileUp, RefreshCw, Sparkles, SpellCheck, FileText } from 'lucide-react';
import { fetchAvailableModels, getSkillContent, getParserSkillContent, getResumeEditorSummaryContent, getResumeEditorRewriteContent, getResumeEditorGrammarContent, getAuditSkillContent, getUiSkillContent } from '@/app/actions/ai';
import { useTranslation } from '@/hooks/useTranslation';
import { useLanguageStore } from '@/store/useLanguageStore';

interface TestLog {
  id: number;
  timestamp: string;
  success: boolean;
  provider: string;
  model: string;
  baseUrl: string;
  duration: number;
  message: string;
  type: 'ATS' | 'UPLOAD' | 'EDITOR';
}

interface AIConfigFormProps {
  title: string;
  settings: AISettings;
  onChange: (settings: Partial<AISettings>) => void;
  onTest: () => Promise<{ success: boolean; message: string; duration?: number }>;
  testLoading: boolean;
  testResult: { success: boolean; message: string; duration?: number } | null;
  modelHint?: string;
  isSynced?: boolean;
}

function AIConfigForm({ 
  title, 
  settings, 
  onChange, 
  onTest, 
  testLoading, 
  testResult,
  modelHint,
  isSynced = false,
}: AIConfigFormProps) {
  const { t } = useTranslation();
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  const inputDisabledClass = isSynced ? "opacity-50 grayscale bg-slate-100 dark:bg-slate-800/50 cursor-not-allowed" : "";

  const providerOptions = useMemo(() => [
    { value: 'gemini' as AIProvider, label: t('providers.gemini'), description: t('providers.geminiDesc') },
    { value: 'ollama' as AIProvider, label: t('providers.ollama'), description: t('providers.ollamaDesc') },
    { value: 'openai' as AIProvider, label: t('providers.openai'), description: t('providers.openaiDesc') },
    { value: 'custom' as AIProvider, label: t('providers.custom'), description: t('providers.customDesc') },
  ], [t]);

  // Detect if running in Docker container
  const isDocker = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' || 
    process.env.NEXT_PUBLIC_DOCKER === 'true' ||
    process.env.DOCKER_CONTAINER === 'true'
  );

  // Get Ollama base URL based on environment
  const getOllamaBaseUrl = () => {
    if (isDocker) {
      return 'http://host.docker.internal:11434/v1';
    }
    return 'http://localhost:11434/v1';
  };

  const handleProviderChange = (provider: AIProvider) => {
    if (isSynced) return;
    const presets: Record<AIProvider, Partial<AISettings>> = {
      gemini: {
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/',
        model: 'gemini-2.5-flash',
      },
      ollama: {
        baseUrl: getOllamaBaseUrl(),
        model: 'llama3.2:3b',
      },
      openai: {
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o-mini',
      },
      custom: {
        baseUrl: '',
        model: '',
      },
    };
    onChange({ provider, ...presets[provider] });
    setAvailableModels([]); // Reset models when provider changes
  };

  const loadModels = async () => {
    if (!settings.apiKey || settings.provider !== 'gemini' || isSynced) return;
    
    setIsLoadingModels(true);
    try {
      const models = await fetchAvailableModels(settings.apiKey, settings.baseUrl);
      setAvailableModels(models);
    } catch (error) {
      console.error('Failed to load models:', error);
    } finally {
      setIsLoadingModels(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-none border border-slate-200 dark:border-slate-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase">
          {title}
        </h3>
        <button
          onClick={onTest}
          disabled={testLoading}
          className="flex items-center gap-1.5 px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white text-[10px] font-bold uppercase tracking-tight rounded transition-colors"
        >
          {testLoading ? (
            <RotateCcw className="size-3 animate-spin" />
          ) : (
            <Play className="size-3" />
          )}
          {t('actions.test')}
        </button>
      </div>

      {testResult && (
        <div className={`mb-3 p-2 rounded ${
          testResult.success 
            ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
        }`}>
          <div className="flex items-start gap-2">
            {testResult.success ? <CheckCircle className="size-3.5 mt-0.5 shrink-0" /> : <XCircle className="size-3.5 mt-0.5 shrink-0" />}
            <div className="flex-1">
              <p className="text-[10px] font-medium whitespace-pre-wrap">{testResult.message}</p>
              {testResult.duration && (
                <p className="text-[9px] mt-0.5 opacity-75 flex items-center gap-1">
                  <Clock className="size-2" /> {testResult.duration}ms
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
            {t('labels.provider')}
          </label>
          <select
            value={settings.provider}
            onChange={(e) => handleProviderChange(e.target.value as AIProvider)}
            disabled={isSynced}
            className={`w-full px-2 py-1.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:ring-1 focus:ring-blue-500 focus:border-transparent ${inputDisabledClass}`}
          >
            {providerOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
              {t('labels.apiKey')}
            </label>
            <input
              type="password"
              value={settings.apiKey}
              onChange={(e) => onChange({ apiKey: e.target.value })}
              disabled={isSynced}
              placeholder={settings.provider === 'ollama' ? 'ollama' : t('labels.apiKey') + '...'}
              className={`w-full px-2 py-1.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:ring-1 focus:ring-blue-500 focus:border-transparent ${inputDisabledClass}`}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                {t('labels.model')} {modelHint && <span className="text-[9px] text-emerald-600 dark:text-emerald-400 lowercase ml-1">{modelHint}</span>}
              </label>
              {settings.provider === 'gemini' && settings.apiKey && !isSynced && (
                <button 
                  onClick={loadModels}
                  disabled={isLoadingModels}
                  title={t('actions.loadModels')}
                  className="text-blue-600 hover:text-blue-700 disabled:opacity-50"
                >
                  <RefreshCw className={`size-3 ${isLoadingModels ? 'animate-spin' : ''}`} />
                </button>
              )}
            </div>
            
            {availableModels.length > 0 ? (
              <select
                value={settings.model}
                onChange={(e) => onChange({ model: e.target.value })}
                disabled={isSynced}
                className={`w-full px-2 py-1.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:ring-1 focus:ring-blue-500 focus:border-transparent ${inputDisabledClass}`}
              >
                <option value={settings.model}>{settings.model} {t('labels.current')}</option>
                {availableModels.filter(m => m !== settings.model).map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={settings.model}
                onChange={(e) => onChange({ model: e.target.value })}
                disabled={isSynced}
                placeholder="Model name"
                className={`w-full px-2 py-1.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:ring-1 focus:ring-blue-500 focus:border-transparent ${inputDisabledClass}`}
              />
            )}
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
            {t('labels.baseUrl')}
          </label>
          <input
            type="text"
            value={settings.baseUrl}
            onChange={(e) => onChange({ baseUrl: e.target.value })}
            disabled={isSynced}
            placeholder="https://api.example.com/v1"
            className={`w-full px-2 py-1.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:ring-1 focus:ring-blue-500 focus:border-transparent ${inputDisabledClass}`}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div>
            <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">{t('labels.temperature')}</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="2"
              value={settings.temperature}
              onChange={(e) => onChange({ temperature: parseFloat(e.target.value) })}
              className="w-full px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-[10px] focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">{t('labels.topP')}</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="1"
              value={settings.topP}
              onChange={(e) => onChange({ topP: parseFloat(e.target.value) })}
              className="w-full px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-[10px] focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">{t('labels.topK')}</label>
            <input
              type="number"
              min="1"
              max="100"
              value={settings.topK}
              onChange={(e) => onChange({ topK: parseInt(e.target.value) })}
              className="w-full px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-[10px] focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">{t('labels.tokens')}</label>
            <input
              type="number"
              min="1"
              max="32000"
              value={settings.maxTokens}
              onChange={(e) => onChange({ maxTokens: parseInt(e.target.value) })}
              className="w-full px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-[10px] focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ConfigForm() {
  const { t } = useTranslation();
  const language = useLanguageStore((state) => state.language);
  const { 
    primaryAI, importAI, editorAI, syncAllModels,
    setPrimaryAI, setImportAI, setEditorAI, setSyncAllModels,
    resetToDefaults 
  } = useAISettingsStore();
  
  const [activeTab, setActiveTab] = useState<'analysis' | 'import' | 'editor'>('analysis');
  const [testLoading, setTestLoading] = useState<{ primary?: boolean; import?: boolean; editor?: boolean; comparison?: boolean }>({});
  const [testResult, setTestResult] = useState<{ primary?: { success: boolean; message: string; duration?: number }; import?: { success: boolean; message: string; duration?: number }; editor?: { success: boolean; message: string; duration?: number }; comparison?: { success: boolean; message: string; duration?: number } }>({});
  const [testLogs, setTestLogs] = useState<TestLog[]>([]);
  const [logId, setLogId] = useState(0);
  const [skillContent, setSkillContent] = useState<string>('');
  const [parserSkillContent, setParserSkillContent] = useState<string>('');
  const [resumeEditorSummaryContent, setResumeEditorSummaryContent] = useState<string>('');
  const [resumeEditorRewriteContent, setResumeEditorRewriteContent] = useState<string>('');
  const [resumeEditorGrammarContent, setResumeEditorGrammarContent] = useState<string>('');
  const [auditSkillContent, setAuditSkillContent] = useState<string>('');
  const [uiSkillContent, setUiSkillContent] = useState<string>('');

  useEffect(() => {
    getSkillContent(language).then(setSkillContent);
    getParserSkillContent(language).then(setParserSkillContent);
    getResumeEditorSummaryContent(language).then(setResumeEditorSummaryContent);
    getResumeEditorRewriteContent(language).then(setResumeEditorRewriteContent);
    getResumeEditorGrammarContent(language).then(setResumeEditorGrammarContent);
    getAuditSkillContent(language).then(setAuditSkillContent);
    getUiSkillContent(language).then(setUiSkillContent);
  }, [language]);

  const testAI = async (type: 'primary' | 'import' | 'editor') => {
    const settings = { 
      ...(type === 'primary' ? primaryAI : type === 'import' ? importAI : editorAI), 
      language 
    };
    const key = type;
    
    setTestLoading(prev => ({ ...prev, [key]: true }));
    setTestResult(prev => ({ ...prev, [key]: undefined }));

    const startTime = Date.now();

    try {
      const response = await fetch('/api/test-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      
      const data = await response.json();
      const duration = Date.now() - startTime;
      
      const result = {
        success: response.ok,
        message: data.message || (response.ok ? t('config.success') : t('config.failed')),
        duration
      };

      setTestResult(prev => ({ 
        ...prev, 
        [key]: result
      }));

      setLogId(prev => prev + 1);
      setTestLogs(prev => [{
        id: logId,
        timestamp: new Date().toLocaleTimeString(language === 'pt' ? 'pt-BR' : 'en-US'),
        success: result.success,
        provider: settings.provider,
        model: settings.model,
        baseUrl: settings.baseUrl,
        duration,
        message: result.message,
        type: (type === 'primary' ? 'ATS' : type === 'import' ? 'UPLOAD' : type === 'editor' ? 'EDITOR' : 'ATS') as 'ATS' | 'UPLOAD' | 'EDITOR'
      }, ...prev].slice(0, 20));

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorMsg = error.message || 'Error';
      setTestResult(prev => ({ 
        ...prev, 
        [key]: { 
          success: false, 
          message: t('templates.error') + ': ' + errorMsg,
          duration
        }
      }));
    } finally {
      setTestLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  const clearLogs = () => setTestLogs([]);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'saving'>('idle');

  const handleSave = () => {
    setSaveStatus('saving');
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 500);
  };

  return (
    <div className="w-full mx-auto px-[15%] py-8">
      <header className="mb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center">
              <Settings className="size-4" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">{t('config.title')}</h1>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-tight">{t('config.subtitle')}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={resetToDefaults}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-none font-bold text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-all border border-slate-200 dark:border-slate-800"
            >
              <RotateCcw className="size-3" />
              {t('actions.restore')}
            </button>
            <button
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-none font-bold text-xs transition-all shadow-sm ${
                saveStatus === 'saved' 
                  ? 'bg-emerald-500 text-white shadow-emerald-500/10' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/10'
              }`}
            >
              {saveStatus === 'saving' ? (
                <RotateCcw className="size-3 animate-spin" />
              ) : saveStatus === 'saved' ? (
                <Check className="size-3" />
              ) : (
                <Save className="size-3" />
              )}
              {saveStatus === 'saving' ? t('actions.saving') : saveStatus === 'saved' ? t('actions.saved') : t('actions.saveSettings')}
            </button>
          </div>
        </div>
      </header>

      {/* Tabs Switcher - Very Compact with Solid Blue Highlight */}
      <div className="mb-6 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-none border border-slate-200 dark:border-slate-700 flex gap-1">
        <button
          onClick={() => setActiveTab('analysis')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${
            activeTab === 'analysis' 
              ? 'bg-blue-600 text-white shadow-md' 
              : 'text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-700/30'
          }`}
        >
          <Zap className={`size-3 ${activeTab === 'analysis' ? 'text-white' : 'text-slate-400'}`} />
          {t('config.tabs.analysis')}
        </button>
        <button
          onClick={() => setActiveTab('import')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${
            activeTab === 'import' 
              ? 'bg-blue-600 text-white shadow-md' 
              : 'text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-700/30'
          }`}
        >
          <FileUp className={`size-3 ${activeTab === 'import' ? 'text-white' : 'text-slate-400'}`} />
          {t('config.tabs.import')}
        </button>
        <button
          onClick={() => setActiveTab('editor')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${
            activeTab === 'editor' 
              ? 'bg-blue-600 text-white shadow-md' 
              : 'text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-700/30'
          }`}
        >
           <Brain className={`size-3 ${activeTab === 'editor' ? 'text-white' : 'text-slate-400'}`} />
           {t('config.tabs.editor')}
         </button>
        </div>

      {/* Sync Models Checkbox */}
      <div className="mb-4 flex items-center gap-2.5 p-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/60 rounded-md transition-colors hover:bg-blue-100/50 dark:hover:bg-blue-900/40">
        <input 
          type="checkbox" 
          id="syncAllModels"
          checked={syncAllModels}
          onChange={(e) => setSyncAllModels(e.target.checked)}
          className="rounded border-blue-300 dark:border-blue-700 text-blue-600 focus:ring-blue-500 size-3.5 cursor-pointer"
        />
        <label htmlFor="syncAllModels" className="flex items-center gap-1.5 text-[10px] font-black text-blue-800 dark:text-blue-300 uppercase tracking-widest cursor-pointer select-none">
          <Link2 className="size-3" />
          {t('config.syncModels')}
        </label>
      </div>

      {testLogs.length > 0 && (
        <div className="mb-5 p-2.5 bg-slate-50 dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-1.5">
            <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
              <Clock className="size-2 inline mr-1" />
              {t('config.history')} ({testLogs.length})
            </h4>
            <button onClick={clearLogs} className="text-[9px] text-slate-400 hover:text-slate-600 flex items-center gap-1">
              <Trash2 className="size-2" /> {t('actions.clear')}
            </button>
          </div>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {testLogs.slice(0, 3).map((log) => (
              <div key={log.id} className={`flex items-center justify-between text-[9px] p-1 rounded ${
                log.success ? 'bg-emerald-50 dark:bg-emerald-900/10' : 'bg-red-50 dark:bg-red-900/10'
              }`}>
                <div className="flex items-center gap-1.5">
                  {log.success ? (
                    <CheckCircle className="size-2 text-emerald-500" />
                  ) : (
                    <XCircle className="size-2 text-red-500" />
                  )}
                  <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">{log.type}</span>
                  <span className="text-slate-400">—</span>
                  <span className="font-medium text-slate-900 dark:text-white">{log.model}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                  <span>{log.duration}ms</span>
                  <span>{log.timestamp}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {activeTab === 'analysis' ? (
          <>
            <AIConfigForm
              title={t('config.primaryAI')}
              settings={primaryAI}
              onChange={setPrimaryAI}
              onTest={async () => {
                await testAI('primary');
                return { success: true, message: '' };
              }}
              testLoading={!!testLoading.primary}
              testResult={testResult.primary || null}
              modelHint={t('labels.recommendedPro')}
            />

            <div className="bg-white dark:bg-slate-800 rounded-none border border-slate-200 dark:border-slate-700 p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  <Brain className="size-3.5 inline mr-1 text-blue-600" />
                  {t('config.skillEditor')}
                </h3>
                <span className="text-[9px] font-black uppercase tracking-tighter text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                  {t('config.readOnly')}
                </span>
              </div>
                <div className="w-full h-48 px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 font-mono text-[10px] leading-normal overflow-y-auto whitespace-pre-wrap select-none">
                  {skillContent || t('actions.loading')}
                </div>
            </div>
          </>
        ) : activeTab === 'import' ? (
          <>
            <AIConfigForm
              title={t('config.importAI')}
              settings={importAI}
              onChange={setImportAI}
              onTest={async () => {
                await testAI('import');
                return { success: true, message: '' };
              }}
              testLoading={!!testLoading.import}
              testResult={testResult.import || null}
              modelHint={t('labels.recommendedFlash')}
              isSynced={syncAllModels}
            />

            <div className="bg-white dark:bg-slate-800 rounded-none border border-slate-200 dark:border-slate-700 p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  <FileText className="size-3.5 inline mr-1 text-blue-600" />
                  {t('config.skillParser')}
                </h3>
                <span className="text-[9px] font-black uppercase tracking-tighter text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                  {t('config.readOnly')}
                </span>
              </div>
              <div className="w-full h-48 px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 font-mono text-[10px] leading-normal overflow-y-auto whitespace-pre-wrap select-none">
                {parserSkillContent || t('actions.loading')}
              </div>
            </div>
          </>
        ) : (
          <>
            <AIConfigForm
              title={t('config.editorAI')}
              settings={editorAI}
              onChange={setEditorAI}
              onTest={async () => {
                await testAI('editor');
                return { success: true, message: '' };
              }}
              testLoading={!!testLoading.editor}
              testResult={testResult.editor || null}
              modelHint={t('labels.recommendedFlash')}
              isSynced={syncAllModels}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-800 rounded-none border border-slate-200 dark:border-slate-700 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Sparkles className="size-3 text-emerald-500" />
                    {t('config.skillSummary')}
                  </h3>
                  <span className="text-[9px] font-black uppercase tracking-tighter text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                    {t('config.readOnly')}
                  </span>
                </div>
                <div className="w-full h-48 px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 font-mono text-[9px] leading-normal overflow-y-auto whitespace-pre-wrap select-none">
                  {resumeEditorSummaryContent || t('actions.loading')}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-none border border-slate-200 dark:border-slate-700 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <RefreshCw className="size-3 text-blue-500" />
                    {t('config.skillRewrite')}
                  </h3>
                  <span className="text-[9px] font-black uppercase tracking-tighter text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                    {t('config.readOnly')}
                  </span>
                </div>
                <div className="w-full h-48 px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 font-mono text-[9px] leading-normal overflow-y-auto whitespace-pre-wrap select-none">
                  {resumeEditorRewriteContent || t('actions.loading')}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-none border border-slate-200 dark:border-slate-700 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <SpellCheck className="size-3 text-emerald-500" />
                    {t('config.skillGrammar')}
                  </h3>
                  <span className="text-[9px] font-black uppercase tracking-tighter text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                    {t('config.readOnly')}
                  </span>
                </div>
                <div className="w-full h-48 px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 font-mono text-[9px] leading-normal overflow-y-auto whitespace-pre-wrap select-none">
                  {resumeEditorGrammarContent || t('actions.loading')}
                </div>
              </div>
            </div>
          </>
        )}
        
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-none p-4 border border-blue-200 dark:border-blue-800">
          <h4 className="text-[10px] font-bold text-blue-900 dark:text-blue-300 mb-1 uppercase tracking-widest">{t('config.tips')}</h4>
          <ul className="text-[10px] text-blue-800 dark:text-blue-400 space-y-0.5 leading-tight">
            <li>• {t('config.tipsList.gemini')}</li>
            <li>• {t('config.tipsList.ollama')}</li>
            <li>• {t('config.tipsList.tokens')}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
