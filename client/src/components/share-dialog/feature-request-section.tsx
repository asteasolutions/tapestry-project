import { noop } from 'lodash-es'
import { TapestryDto } from 'tapestry-shared/src/data-transfer/resources/dtos/tapestry'
import { useAsync } from 'tapestry-core-client/src/components/lib/hooks/use-async'
import { useAsyncAction } from 'tapestry-core-client/src/components/lib/hooks/use-async-action'
import { Button } from 'tapestry-core-client/src/components/lib/buttons/index'
import { Icon } from 'tapestry-core-client/src/components/lib/icon/index'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { resource } from '../../services/rest-resources'
import { describeError } from '../../errors'
import styles from './styles.module.css'
import { FeatureRequestDto } from 'tapestry-shared/src/data-transfer/resources/dtos/feature-request'

interface FeatureRequestSectionProps {
  tapestry: TapestryDto
}

function getDescription(tapestry: TapestryDto, request?: FeatureRequestDto | null) {
  if (tapestry.featured) {
    return 'This tapestry is featured in the public Gallery.'
  }
  if (tapestry.visibility !== 'link') {
    return 'Share this tapestry with anyone with the link to ask for it to be featured in the public Gallery.'
  }
  if (!request) {
    return 'Ask the Tapestries team to feature this tapestry in the public Gallery.'
  }
  if (request.status === 'pending') {
    return 'Your request is waiting for review by the Tapestries team.'
  }
  if (request.status === 'declined') {
    return 'Your last request was declined. You can submit a new one.'
  }
}

export function FeatureRequestSection({ tapestry }: FeatureRequestSectionProps) {
  const { data: latestRequest, reload } = useAsync(
    async ({ signal }) => {
      const { data } = await resource('featureRequests').list(
        { filter: { 'tapestryId:eq': tapestry.id }, orderBy: '-createdAt', limit: 1 },
        { signal },
      )
      return data.at(0) ?? null
    },
    [tapestry.id],
  )

  const {
    perform: submit,
    loading: submitting,
    error,
  } = useAsyncAction(async ({ signal }) => {
    await resource('featureRequests').create({ tapestryId: tapestry.id }, {}, { signal })
    reload(noop)
  })

  const isLinkShared = tapestry.visibility === 'link'
  const isPending = latestRequest?.status === 'pending'

  return (
    <div className={styles.featureRequest}>
      <div>
        <Text component="div" style={{ fontWeight: 600 }}>
          Feature in the Gallery
        </Text>
        <Text component="div" variant="bodyXs">
          {getDescription(tapestry, latestRequest)}
        </Text>
        {error ? (
          <Text component="div" variant="bodyXs" textType="error">
            {describeError(error)}
          </Text>
        ) : null}
      </div>
      {tapestry.featured ? (
        <Icon icon="public" />
      ) : isPending ? (
        <Text variant="bodySm" className={styles.pendingBadge}>
          Pending
        </Text>
      ) : (
        <Button
          variant="secondary"
          size="small"
          disabled={!isLinkShared || submitting || latestRequest === undefined}
          onClick={() => void submit().catch(noop)}
        >
          Request
        </Button>
      )}
    </div>
  )
}
