import { uniqueId } from 'lodash-es'
import { useRef, useState } from 'react'
import { useAsyncAction } from 'tapestry-core-client/src/components/lib/hooks/use-async-action'
import { Input } from 'tapestry-core-client/src/components/lib/input/index'
import { SimpleModal } from 'tapestry-core-client/src/components/lib/modal/index'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { getPaletteColor } from 'tapestry-core-client/src/theme/design-system'
import { UserDto } from 'tapestry-shared/src/data-transfer/resources/dtos/user'
import geminiGuideVideo from '../../../assets/videos/gemini-api-guide.mov'
import { resource } from '../../../services/rest-resources'
import styles from './styles.module.css'
interface ApiKeyDialogProps {
  user: UserDto
  onClose: () => void
  onSubmitted: () => void
  showGuide?: boolean
}

export function ApiKeyDialog({ user, onClose, onSubmitted, showGuide }: ApiKeyDialogProps) {
  const [step, setStep] = useState<'guide' | 'input'>(showGuide ? 'guide' : 'input')
  const [form] = useState(() => uniqueId('form'))

  const apiKeyInputRef = useRef<HTMLInputElement>(null)

  const { perform: createUserSecret, loading: creating } = useAsyncAction(
    ({ signal }) =>
      resource('userSecrets').create(
        { ownerId: user.id, type: 'googleApiKey', value: apiKeyInputRef.current!.value },
        {},
        { signal },
      ),
    { onAfterAction: onSubmitted },
  )

  return (
    <SimpleModal
      classes={{ root: styles.addApiKeyDialog }}
      title={step === 'guide' ? 'API Guide' : 'Add an API Key'}
      cancel={{ onClick: onClose }}
      confirm={{
        text: step === 'guide' ? 'Continue' : 'Save Key',
        disabled: creating,
        ...(step === 'guide' ? { onClick: () => setStep('input') } : { form }),
      }}
      extraButtons={
        showGuide ? (
          <Text
            variant="bodyXs"
            style={{
              alignSelf: 'center',
              marginRight: 'auto',
              color: getPaletteColor('neutral.400'),
            }}
          >
            Step {step === 'guide' ? 1 : 2}/2
          </Text>
        ) : undefined
      }
    >
      {step === 'guide' && (
        <>
          <video src={geminiGuideVideo} controls></video>
          <div style={{ whiteSpace: 'nowrap' }}>
            <Text style={{ color: 'var(--theme-text-tertiary)', fontSize: '18px' }}>
              Link to Gemini API Key:
            </Text>
            <Text
              variant="body"
              component="a"
              style={{ color: 'var(--theme-text-link)', marginLeft: '8px' }}
              href="https://aistudio.google.com/app/api-keys"
              target="_blank"
            >
              https://aistudio.google.com/app/api-keys
            </Text>
          </div>
        </>
      )}
      {step === 'input' && (
        <form
          id={form}
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault()
            void createUserSecret()
          }}
        >
          <Text>This key is for your AI chats only and is securely stored.</Text>
          <Input
            label={<Text className={styles.labelText}>API Key *</Text>}
            className={styles.input}
            typography="body"
            placeholder="E.g. AIzaSyDaGmWKa4JsXZ-HjGw7ISLn_3namBGewQe"
            required
            minLength={3}
            ref={apiKeyInputRef}
          />
        </form>
      )}
    </SimpleModal>
  )
}
