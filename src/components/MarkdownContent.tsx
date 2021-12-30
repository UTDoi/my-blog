import * as React from "react"
import tw, { styled } from "twin.macro"

type Props = {
  children: React.ReactNode
}

const StyledMarkdown = styled.div`
  h2 {
    ${tw`text-2xl font-bold border-b border-b-black my-9 pb-2`}
  }

  h3 {
    ${tw`text-xl border-l-2 border-l-black my-7 pl-1.5`}
  }

  h4 {
    ${tw`text-lg my-5 font-bold`}
  }

  h5 {
    ${tw`text-gray-700 my-3`}
  }

  p {
    ${tw`mb-4`}
  }

  ul {
    ${tw`my-4 list-disc`}
  }

  ol {
    ${tw`my-4 list-decimal`}
  }

  li {
    ${tw`my-1 mx-6`}
  }
`

const MarkdownContent: React.VFC<Props> = ({ children }) => (
  <StyledMarkdown>{children}</StyledMarkdown>
)

export default MarkdownContent
