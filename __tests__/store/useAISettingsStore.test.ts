import { useAISettingsStore } from '../../store/useAISettingsStore';

// Mock Supabase client is not needed anymore as the store doesn't use it directly in the same way,
// but we should fix the test to match the current store implementation.

describe('useAISettingsStore', () => {
  beforeEach(() => {
    const { resetToDefaults } = useAISettingsStore.getState();
    resetToDefaults();
    jest.clearAllMocks();
  });

  it('should have initial state', () => {
    const state = useAISettingsStore.getState();
    expect(state.syncStatus).toBe('idle');
    expect(state.primaryAI.provider).toBe('gemini');
  });

  it('setAtsPrompt should update state', () => {
    const { setAtsPrompt } = useAISettingsStore.getState();
    setAtsPrompt('New Test Prompt');
    
    const updatedState = useAISettingsStore.getState();
    expect(updatedState.atsPrompt).toBe('New Test Prompt');
  });

  it('setPrimaryAI should update state partially', () => {
    const { setPrimaryAI } = useAISettingsStore.getState();
    setPrimaryAI({ provider: 'openai', apiKey: 'test-key' });
    
    const updatedState = useAISettingsStore.getState();
    expect(updatedState.primaryAI.provider).toBe('openai');
    expect(updatedState.primaryAI.apiKey).toBe('test-key');
    // Check that default values remain
    expect(updatedState.primaryAI.temperature).toBe(0.7);
  });
});
