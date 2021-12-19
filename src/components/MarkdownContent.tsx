import * as React from "react"
import { styled } from "twin.macro"

type Props = {
  children: React.ReactNode
}

const StyledMarkdown = styled.div`
  h1 {
  }

  h2 {
  }

  h3 {
  }

  h4 {
  }

  h5 {
  }

  ul {
  }

  li {
  }
`

const MarkdownContent: React.VFC<Props> = ({ children }) => (
  <StyledMarkdown>{children}</StyledMarkdown>
)

export default MarkdownContent
