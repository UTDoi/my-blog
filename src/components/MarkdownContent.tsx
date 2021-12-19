import * as React from "react"
import tw, { styled } from "twin.macro"

type Props = {
  children: React.ReactNode
}

const StyledMarkdown = styled.div`
  h2 {
    ${tw`text-2xl font-bold border-b border-b-black my-7 pb-2`}
  }

  h3 {
    ${tw`text-xl border-l-2 border-l-black my-4 pl-1.5`}
  }

  h4 {
    ${tw`text-lg`}
  }

  ul {
    ${tw`my-4 list-disc`}
  }

  li {
    ${tw`my-1 mx-6`}
  }
`

const MarkdownContent: React.VFC<Props> = ({ children }) => (
  <StyledMarkdown>{children}</StyledMarkdown>
)

export default MarkdownContent
