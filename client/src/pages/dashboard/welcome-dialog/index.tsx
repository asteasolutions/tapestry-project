import { useState } from 'react'
import { Checkbox } from 'tapestry-core-client/src/components/lib/checkbox'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import styles from './styles.module.css'
import { SimpleModal } from 'tapestry-core-client/src/components/lib/modal/index'
import { SvgIcon } from 'tapestry-core-client/src/components/lib/svg-icon/index'
import Logo from '../../../assets/icons/logo.svg?react'

interface WelcomeDialogProps {
  onClose: (dontShowAgain: boolean) => unknown
  initialCheckboxValue: boolean
}

export function WelcomeDialog({ onClose, initialCheckboxValue }: WelcomeDialogProps) {
  const [dontShowAgain, setDontShowAgain] = useState(initialCheckboxValue)

  return (
    <SimpleModal
      title={
        <Text variant="h6" className={styles.header}>
          <div className={styles.iconContainer}>
            <SvgIcon Icon={Logo} size={24}></SvgIcon>
          </div>
          Welcome to Tapestries
        </Text>
      }
      onClose={() => onClose(dontShowAgain)}
      classes={{ root: styles.root }}
      cancel={{
        text: 'Close',
        onClick: () => onClose(dontShowAgain),
      }}
      extraButtons={
        <Checkbox
          label="Don't show again"
          checked={dontShowAgain}
          onChange={() => setDontShowAgain(!dontShowAgain)}
        />
      }
    >
      <Text className={styles.content} component="div">
        <p>
          75 years into the digital era, much of our online communication is still rooted in the
          linear strictures of print. Browsers make us jump from tab to tab, thus obscuring a sense
          of the whole, including how the different bits are connected, all of which robs the
          “reader” of valuable context.
        </p>
        <p>
          With Tapestries people can create non-linear presentations that are more in synch with the
          way our re-wired brains are beginning to understand the world — as a multi-faceted
          assemblage of related ideas, letting authors dynamically explain how things are connected.
        </p>
        <p>
          Tapestries are <Text component="em">not</Text> simply lists of links, requiring the user
          to click and go somewhere else. Rather they are an array of functional objects: each one
          visible and ready to be accessed and explored.
        </p>
        <p>
          You create a Tapestry by dragging digital objects — text, images, audio, video, software
          and entire web pages onto a blank infinite canvas. Size and placement is entirely up to
          the author.
        </p>
        <p>
          Tapestries can be displayed anywhere. Think of Tapestries as portable compound
          illustrations comprised of fully functional digital objects which can be embedded on any
          web page.
        </p>
        <p>
          Readers can comment on any part of a Tapestry or on the whole. Comments can be public or
          posted to a private group. For deeper collaboration, you can also invite other people to
          edit a Tapestry with you.
        </p>
        <p>
          If creators have given permission, readers can make their own editable copies and remake
          them as they please.
        </p>
        <p>
          To get started simply click the login link in the upper right and follow the prompt. You
          only need a Google email address or Internet Archive authenticated email address. Anything
          you do will be completely private unless you choose to share.
        </p>
      </Text>
    </SimpleModal>
  )
}
