import { graphql, PageProps } from "gatsby"
import { StaticImage } from "gatsby-plugin-image"
import * as React from "react"
import { IconContext } from "react-icons"
import { FaGithub, FaLinkedin, FaMapMarkerAlt, FaTwitter } from "react-icons/fa"
import { SiGmail } from "react-icons/si"
import "twin.macro"
import Layout from "../components/Layout"
import MarkdownContent from "../components/MarkdownContent"
import Seo from "../components/Seo"

const AboutPage: React.VFC<PageProps<GatsbyTypes.AboutPageQuery>> = ({
  data,
}) => {
  const { markdownRemark } = data
  return (
    <Layout>
      <Seo title="About" />
      <div tw="text-center mt-4">
        <StaticImage
          src="../../content/assets/profile.jpg"
          alt="profile image"
          placeholder="tracedSVG"
          width={200}
          height={200}
          tw="rounded-full inline-block"
        />
        <div tw="mt-4 text-3xl font-bold">UTDoi</div>
        <div tw="mt-1">Software Developer</div>
        <div tw="text-sm mt-1 mb-8">
          <FaMapMarkerAlt tw="inline-block mr-0.5" />
          Tokyo
        </div>
        <IconContext.Provider value={{ size: "2rem" }}>
          <div tw="flex justify-around mt-3 mb-5">
            <div>
              <a
                href="https://github.com/UTDoi"
                target="_blank"
                rel="noreferrer"
              >
                <FaGithub />
              </a>
            </div>
            <div>
              <a
                href="https://twitter.com/utdoi1"
                target="_blank"
                rel="noreferrer"
              >
                <FaTwitter />
              </a>
            </div>
            <div>
              <a
                href="https://www.linkedin.com/in/yutaro-doi-48a903187"
                target="_blank"
                rel="noreferrer"
              >
                <FaLinkedin />
              </a>
            </div>
            <div>
              <a
                href="https://forms.gle/2uWvqHzE3nLggxVC9"
                target="_blank"
                rel="noreferrer"
              >
                <SiGmail />
              </a>
            </div>
          </div>
        </IconContext.Provider>
        <MarkdownContent>
          <div
            dangerouslySetInnerHTML={{ __html: markdownRemark?.html || "" }}
            tw="text-left"
          />
        </MarkdownContent>
      </div>
    </Layout>
  )
}

export const query = graphql`
  query AboutPage {
    markdownRemark(frontmatter: { title: { eq: "about page" } }) {
      html
    }
  }
`

export default AboutPage
