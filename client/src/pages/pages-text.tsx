import { ReactNode } from 'react'

type TextContent = string | ReactNode

type TextSection = {
  title?: TextContent
  subtitle?: TextContent
  content?: TextContent | TextContent[]
  subsections?: Record<string, TextSection> | TextSection[]
}

export const LANDING_PAGE_TEXT = {
  heading: {
    title: 'Tapestries',
    subtitle: 'Weave it all together',
    content: [
      <>
        A tapestry is a shareable canvas for curating media artifacts from across the digital world.
        <br />
        <br />
        As generative AI colonizes our work, thinking, and attention, Tapestries offers a sheltered
        space where your mind's natural process of making connections comes first. <br />
        <br />
      </>,

      <em>
        On your own or together,
        <br />
        it’s something only you could make.
      </em>,
    ],
    subsections: {
      AWMT: {
        content:
          'Tapestries is the first project of As We May Think, a lab dedicated to strengthening the digital commons. Tapestries was developed in partnership with the Internet Archive.',
      },
    },
  },
  events: {
    title: 'Join our weekly weaving circle',
    content:
      "Tapestries is just coming out into the world and we want to connect with anyone who's exploring it. To start, we're holding weekly video calls where folks can come to learn about the project, meet the team behind it, get technical help, share their projects, and see what others are working on.",
  },
  media: {
    title: (
      <>
        Not just links:
        <br />a self-contained universe of embedded media
      </>
    ),
    subtitle:
      'Add any kind of asset (image, audio, video, PDF document, or web page) to your tapestry and start weaving a web of relationships...',
    subsections: [
      {
        title: 'Anchored in the digital commons',
        content:
          'Designed to play well with open repositories like the Internet Archive, Wikimedia, OpenVerse, and standards like IIIF, as well as other embeddable media platforms such as YouTube',
      },
      {
        title: 'Freedom to associate',
        content:
          'Gather with trusted collaborators, learn together, steward community knowledge, build common ground',
      },
      {
        title: 'Open to all ways of knowing',
        content:
          'From academic knowledge to oral tradition, from institutions to community-based archives, from personal memory to creative internet research',
      },
      {
        title: 'Here to help digital memory endure',
        content:
          'Made with simple web technologies and archiving features to help knowledge travel safely into the future',
      },
    ],
  },
  ceciliaQuote: {
    content: (
      <>
        “Everything is falling apart because of lack of connections. Weaving is the connection that
        is missing, the connection between people and themselves, people and nature.”
        <br />
        <br />- Cecilia Vicuña
      </>
    ),
  },
  usage: {
    title: 'What are people doing with Tapestries?',
    subtitle: (
      <>
        While there are many possible applications, one area we’re particularly passionate about is
        growing Tapestries at the intersection of <strong>education</strong> (formal, informal,
        communal) and <strong>digital collections</strong> (libraries, museums, community-based
        archives, the web itself — wherever knowledge is held). But we are truly excited about the
        many unexpected uses for Tapestries we might discover.
      </>
    ),
    content: "Curious about Tapestries? We'd love to help you explore it.",
    subsections: [
      {
        title: 'Tapestries for Education',
        subtitle: 'Generative AI is changing how students write, research, and read.',
        content: (
          <>
            College professors and high school teachers are using Tapestries to create assignments
            that resist AI shortcuts and build critical skills. This gives students the opportunity
            to do their own creative research, to evaluate sources, and to build dynamic projects
            that foster a sense of agency.
          </>
        ),
      },
      {
        title: 'Tapestries for Collections',
        subtitle: 'Centuries of digitized history and culture doesn’t tell its own story.',
        content: (
          <>
            Tapestries actually originated in archives. Now the Internet Archive is using its own
            installation of Tapestries to enable readers to surface the narratives hiding in its
            vast trove of historical web pages, digitized books, documents, multimedia and software.
          </>
        ),
      },
      {
        title: 'Tapestries for...',
        subtitle: 'A blank canvas, infinite possibilities.',
        content: (
          <>
            We're exploring many more applications for Tapestries — in journalism, the arts,
            creative writing, knowledge management, personal digital memory, and beyond. If you have
            ideas for how Tapestries could support your work, or use cases that we haven’t thought
            of, we’d love to hear from you.
          </>
        ),
      },
    ],
  },
  openSource: {
    title: 'Open Source',
    subtitle: '(at a strange time for software development)',
    content: (
      <>
        Tapestries is being built the old-fashioned way, by a talented team of developers in Sofia,
        Bulgaria. But we're wide awake to how agentic AI is transforming the way we code, blurring
        the line between developer and user.
        <br />
        <br />
        <strong>
          While Tapestries is about learning and thinking <em>without</em> AI, we're curious about
          how these capabilities might let users sharpen or generate their own tools inside it.
        </strong>{' '}
        They could help with gathering and importing media, say, or eventually with programming more{' '}
        complex "events" in a tapestry, hearkening back to how{' '}
        <a href="https://www.youtube.com/watch?v=hxHkNToXga8" target="_blank">
          HyperCard
        </a>{' '}
        let non-technical Apple users build their own custom information experiences.
        <br />
        <br />
        We're already experimenting with coding agents at the edges of our development process (a
        few current features were made this way), and we're curious what it could look like to open
        this up further.
        <br />
        <br />
        <strong>We want to hear what you have to say.</strong> If you can imagine other use cases or
        want to explore new directions for the software, whether by vibe coding new features,
        setting up your own instance, submitting a pull request, or getting involved with the team,
        explore our GitHub repo or drop us a line.
      </>
    ),
  },
} as const satisfies Record<string, TextSection>

export const ABOUT_PAGE_TEXT = {
  about: {
    title: 'About',
    subtitle: "What's going on?",
    content: (
      <>
        The internet used to be a weird, wild, open human network. Then a handful of closed
        platforms took over, herding us into algorithmic feeds, doom scrolls and surveillance,
        eroding the internet as a commons for knowledge-sharing and collective sense-making.
        <br />
        <br />
        Now, reckless AI hyperscaling is accelerating this slide. Chatbots and AI search summaries
        offer up a highly processed information diet that weakens our connection to the sources of
        knowledge, starves the human networks of creators and publishers, and dulls our cognitive
        and creative faculties. We're told this change is inevitable, but
      </>
    ),
    subsections: {
      subtitleQuote: {
        content: (
          <>
            "Technology is not neutral. We're inside of what we make, and it's inside of us. We're
            living in a world of connections – and it matters which ones get made and unmade." -
            Donna Haraway
          </>
        ),
      },
      choice: {
        title: "It's important to remember we have a choice ",
        subtitle: '- in the tools we use, the values they carry, and how we let them shape us.',
        content:
          'As we learn to live in this strange new world, Tapestries offers a counterbalancing strategy. A way to slow down and work with the web differently. By centering the hands-on work - of finding and organizing source material, of making connections between things, of creating new knowledge from old - it offers a way to maintain a more direct relationship with the media vessels and artifacts that carry what we know lest we forget how to do that work, or stop believing we can.',
      },
    },
  },
  history: {
    title: 'The Future Has A Right to the Past',
    content: [
      <>
        The idea for Tapestries emerged a few years back as Bob Stein, founder of the Criterion
        Collection and Voyager Company, was wrestling with how to put his archive (now at Stanford)
        online.
      </>,
      <>
        An archive is like a life, containing multitudes. Bob's comprises 250+ linear feet of
        correspondence, planning documents, contracts, magazines, protest literature and ephemera,
        plus CD-ROMs, laser discs, cassettes, and hard drives full of digital media. Innumerable
        stories thread through it - about how the digital world was dreamed up, how accidents of
        timing led to breakthroughs, and also dead ends. But to come alive for future generations,
        it needs a way to coalesce into a cosmology of its own. It needs context, guiding
        commentary, connections to other archives, multiple entry points and pathways for
        exploration.
        <br />
        <br />
        <br />
        Tapestries started with this desire for a more imaginative, even playful, approach to
        archival presentation - and with the broader question of how we make the past meaningfully
        accessible to the future. Bob brought in Dan Visel, an old colleague from the{' '}
        <a href="https://www.futureofthebook.org/" target="_blank">
          Institute for the Future of the Book
        </a>
        , who played a huge role in shaping these ideas into software. Soon after, the Internet
        Archive, curious about Tapestries' potential to reveal stories from its vast digital
        storehouse, joined as a founding partner.
        <br />
        <br />
        <br />
        Fast forward. Another original Institute colleague, Ben Vershbow, came on board to direct
        Tapestries as the first initiative of a new lab,{' '}
        <a href="https://awmt.org/" target="_blank">
          As We May Think
        </a>
        . Bob founded the Institute at another moment of techno-cultural transition: the dawn of
        "Web 2.0" and social media. Through its blog, "if:book," and experiments in communal
        knowledge production, the Institute carved out a unique perspective joining the formative
        period of personal computing with a critique of the contemporary social web. As We May
        Think, and Tapestries with it, carries on this intergenerational tradition.
        <br />
        <br />
        <br />
      </>,
    ],
  },
  snapshots: {
    title: 'Archive Snapshots',
    subtitle:
      "Bob's archive has been a good test bed for Tapestries. Here are a few early experiments. He's working now on an extensive list of tapestries that will be posted at Stanford and the Internet Archive",
  },
  principles: {
    title: 'Guiding Principles',
    subsections: [
      {
        title: 'Open source & fundamentally decentralized',
        content: (
          <>
            The Tapestries code base is and always will be open source. While tapestries.media will
            likely be a prominent, public node, anyone can set up their own Tapestries server and
            align it to their community's specific needs and norms - that's already how it works at
            the Internet Archive, which runs its own lightly customized install.
            <br />
            <br />
            We realize that, as usage grows, this could become increasingly complicated - both in
            terms of content discovery across a federated tapestry ecosystem, and of governance as
            an open source project. But these are complexities we believe are worth tackling.
          </>
        ),
      },
      {
        title: 'Portable and preservable',
        content: (
          <>
            From a technical perspective, Tapestries is not cutting edge - and that's intentional.
            It's built on common web standards and open principles that we believe will make it a
            durable vessel for carrying digital knowledge into the future. Working with the Internet
            Archive means that that long view is baked in. Tapestries is already integrated with the
            Wayback Machine, so pages that can't be embedded can fetch a Wayback capture instead.
            <br />
            <br />
            Any tapestry can already be exported as a zip and stored offline. Inspired by George
            Oates' work on Data Lifeboats, we intend to develop this into a full archiving solution
            that packages an entire tapestry into a single preservable object, deposit-able in a
            long-term repository or run as a static site, even offline.
          </>
        ),
      },
      {
        title: 'Community technology, not social media',
        content: (
          <>
            Tapestries are private by default, but meant to be shared, if only with a few trusted
            collaborators. You're in charge of how public your work is. Multiple people can work in
            a tapestry simultaneously or asynchronously, and we plan to enable annotation and
            discussion at a granular level.
            <br />
            <br />
            Tapestries is not surveillance tech. There will never be ads. It does not track you and
            will never harvest or sell your data. We don't even have our own account system - just
            third-party auth from services you already use. A creator can delete a tapestry, or
            export and take it off-platform, at any time.
            <br />
            <br />
            Tapestries will always be free to use, but not free to grow and maintain. As it evolves,
            we'll consider transparent, non-coercive sustaining models - with the creators and
            communities who use Tapestries at the center. We're studying cooperatives as a possible
            model for shared ownership.
          </>
        ),
      },
      {
        title: 'AI at the edges, not the core',
        content: (
          <>
            We're not anti-AI, but we think it's being rolled out recklessly - built on extractive
            labor and data, encoding bias at scale, and now arriving faster than we can absorb it.
            People are anxious about their jobs, their attention, their creativity, their kids'
            education. Tapestries is meant as a safer, slower alternative - one small piece of
            putting people back at the center of the internet.
            <br />
            <br />
            While we're not opposed to AI playing a part in software development, or helping with
            the tedious work of aggregating media sources, at the heart of Tapestries is a sacred
            space for the mind to do its own slow, painstaking work of curation, juxtaposition,
            analysis and synthesis - engaging directly with materials made with real human
            communicative intent. We see this manual work as a feature, not a problem to be solved
            away.
          </>
        ),
      },
    ],
  },
  team: {
    title: 'Team',
    subtitle:
      'Tapestries is being developed by an intergenerational team of folks who have worked for decades at the intersection of education, publishing, knowledge institutions, and the open web.',
    subsections: [
      {
        title: 'Core team',
        content: (
          <>
            Ben Vershbow (Project Director)
            <br />
            <br />
            Bob Stein (Project Founder)
            <br />
            <br />
            Dan Visel (Solutions Architect/Developer, Internet Archive)
            <br />
            <br />
            Jess Klein (Homepage Designer)
            <br />
            <br />
            Abbey Ignacio (Design Intern)
          </>
        ),
      },
      {
        title: 'Development partners at Astea',
        content: (
          <>
            Ivaylo Sachanski
            <br />
            <br />
            Zahari Marinov <br />
            <br />
            Eva Banova
            <br />
            <br />
            Stanislav Trendafilov
            <br />
            <br />
            Radan Ganchev
            <br />
            <br />
            Marta Petrova
          </>
        ),
      },
      {
        title: 'Advisory circle',
        content: (
          <>
            Maria Bustillos (Flaming Hydra / Phoenix Library)
            <br />
            <br />
            JJ Dearborn (Data Futures / GBIF)
            <br />
            <br />
            Medhavi Gandhi (Heritage Lab India)
            <br />
            <br />
            Josh Hadro (Library of Congress)
            <br />
            <br />
            Andrew Lih (Wikimedia / MIT / Smithsonian)
          </>
        ),
      },
    ],
  },
} as const satisfies Record<string, TextSection>
