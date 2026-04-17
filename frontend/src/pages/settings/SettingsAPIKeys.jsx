import APIKeyManager from '../../components/APIKeyManager';

export default function SettingsAPIKeys() {
  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-6">API Keys</h2>
      <APIKeyManager variant="page" />
    </div>
  );
}
