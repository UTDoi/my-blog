import * as React from "react"
import "twin.macro"

const Footer: React.VFC = () => (
  <footer>
    © {new Date().getFullYear()}, Built with
    {` `}
    <a href="https://www.gatsbyjs.com">Gatsby</a>
  </footer>
)

export default Footer
