import clsx from 'clsx'
import { ComponentProps, createElement } from 'react'
import styles from './styles.module.css'

// Must be sorted alphabetically
const ICONS = [
  'abc',
  'account_balance',
  'add',
  'add_link',
  'animated_images',
  'api',
  'arrow_back',
  'arrow_downward',
  'arrow_drop_down',
  'arrow_drop_up',
  'arrow_forward',
  'arrow_forward_ios',
  'arrow_range',
  'arrow_right_alt',
  'arrow_upward',
  'arrows_input',
  'audio_file',
  'auto_stories',
  'autoplay',
  'bookmark',
  'call',
  'cancel',
  'center_focus_strong',
  'chat_bubble',
  'check_circle',
  'chevron_left',
  'chevron_right',
  'close',
  'code',
  'collections_bookmark',
  'content_copy',
  'content_paste',
  'crop_free',
  'dark_mode',
  'dashboard_customize',
  'delete',
  'draft',
  'drag_pan',
  'edit',
  'edit_note',
  'edit_square',
  'error',
  'fast_forward',
  'fast_rewind',
  'feature_search',
  'file_copy',
  'format_align_center',
  'format_align_left',
  'format_align_right',
  'format_bold',
  'format_color_text',
  'format_italic',
  'format_list_bulleted',
  'format_list_numbered',
  'format_underlined',
  'fullscreen',
  'fullscreen_exit',
  'globe',
  'grid_view',
  'group_add',
  'hide_image',
  'horizontal_rule',
  'hourglass_top',
  'iframe',
  'image',
  'imagesmode',
  'info',
  'keyboard',
  'keyboard_arrow_left',
  'keyboard_arrow_right',
  'left_click',
  'light_mode',
  'line_weight',
  'link',
  'link_off',
  'lock',
  'logout',
  'match_case',
  'menu_book',
  'minimize',
  'more_horiz',
  'more_vert',
  'mouse',
  'note_stack',
  'open_in_new',
  'open_with',
  'palette',
  'pan_tool',
  'pause',
  'pause_circle',
  'pending',
  'picture_as_pdf',
  'picture_in_picture_center',
  'pinch_zoom_in',
  'play_arrow',
  'play_circle',
  'public',
  'publish',
  'radio_button_checked',
  'redo',
  'refresh',
  'remove',
  'search',
  'send',
  'sentiment_very_dissatisfied',
  'settings',
  'share',
  'skip_next',
  'skip_previous',
  'smart_display',
  'stack',
  'stack_group',
  'stop',
  'strikethrough_s',
  'table_convert',
  'text_fields',
  'toc',
  'trackpad_input_2',
  'travel_explore',
  'undo',
  'unfold_more',
  'upload',
  'upload_file',
  'vertical_align_top',
  'video_file',
  'videocam',
  'view_sidebar',
  'visibility',
  'wallpaper',
  'wand_stars',
  'wifi_off',
] as const
export type IconName = (typeof ICONS)[number]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IconComponent = keyof React.JSX.IntrinsicElements | React.JSXElementConstructor<any>

type IconProps<T extends IconComponent = 'span'> = Omit<ComponentProps<T>, 'component'> & {
  icon: IconName
  filled?: boolean
  component?: T
}

export function Icon<T extends IconComponent = 'span'>({
  icon,
  filled = false,
  component,
  className,
  ...rest
}: IconProps<T>) {
  return createElement(
    component ?? 'span',
    {
      className: clsx('material-symbols-outlined', className, { [styles.filled]: filled }),
      ...rest,
    },
    icon,
  )
}

export function GoogleFonts() {
  return (
    <>
      <link
        href={`https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:FILL@0..1&icon_names=${ICONS.join(',')}&display=block`}
        rel="stylesheet"
        precedence="medium"
      />
      <link
        href={`https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&family=Carattere&family=Caveat:wght@400..700&family=Montserrat:ital,wght@0,100..900;1,100..900&family=Open+Sans:ital,wght@0,300..800;1,300..800&family=Raleway:ital,wght@0,100..900;1,100..900&family=Roboto:ital,wght@0,100..900;1,100..900&family=Source+Code+Pro:ital,wght@0,200..900;1,200..900&family=Tinos:ital,wght@0,400;0,700;1,400;1,700&display=swap`}
        rel="stylesheet"
        precedence="medium"
      />
    </>
  )
}
