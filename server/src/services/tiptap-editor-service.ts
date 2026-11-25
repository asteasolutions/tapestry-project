import { generateHTML, generateJSON } from '@tiptap/html'
import { Extensions, getSchema, JSONContent } from '@tiptap/core'
import { EditorState } from '@tiptap/pm/state'
import { Node, Schema, Attrs } from '@tiptap/pm/model'

//extensions = getExtensions({ controls: TEXT_ITEM_EXTENSIONS_MASK, onCreateLink: () => false })
export class TiptapEditorService {
  private schema: Schema
  private state: EditorState

  constructor(
    private extensions: Extensions,
    html: string,
  ) {
    this.schema = getSchema(extensions)
    const doc = Node.fromJSON(this.schema, generateJSON(html, this.extensions))
    this.state = EditorState.create({ doc, schema: this.schema })
  }

  setMark(markName: string, from: number, to: number, attrs: Attrs) {
    const mark = this.schema.marks[markName].create(attrs)
    const tr = this.state.tr.addMark(from, to, mark)

    this.state = this.state.apply(tr)
  }

  unsetMark(markName: string, attrs: Attrs) {
    const mark = this.schema.marks[markName].create(attrs)
    const tr = this.state.tr.removeMark(0, this.state.doc.content.size, mark)

    this.state = this.state.apply(tr)
  }

  toHTML() {
    return generateHTML(this.state.doc.toJSON() as JSONContent, this.extensions)
  }
}
