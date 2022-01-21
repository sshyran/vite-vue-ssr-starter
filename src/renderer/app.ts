import { createSSRApp, defineComponent, h, markRaw, reactive } from 'vue'
import DefaultLayout from './DefaultLayout.vue'
import type { Component, PageContext } from './types'
import { setPageContext } from './usePageContext'
import { getHead } from "./useHead";
import { getStore } from "./useStore";

export { createApp }

// css
import 'virtual:windi.css';
import '~/assets/styles/main.scss';

// plugins
const plugins = import.meta.globEager('/src/plugins/*.js')

// other
import 'virtual:svg-icons-register';

function createApp(pageContext: PageContext) {
  const { Page } = pageContext

  let rootComponent: Component
  const PageWithWrapper = defineComponent({
    data: () => ({
      Page: markRaw(Page),
      pageProps: markRaw(pageContext.pageProps || {}),
    }),
    created() {
      rootComponent = this
    },
    render() {
      return h(
          DefaultLayout,
        {},
        {
          default: () => {
            return h(this.Page, this.pageProps)
          },
        },
      )
    },
  })

  const app = createSSRApp(PageWithWrapper)
  app.use(getHead())
  app.use(getStore())

  for (const path in plugins) {
    // @ts-ignore
    plugins[path].default(app, (key: string, value: any) => {
      app.config.globalProperties['$' + key] = value;
    });
  }

  // We use `app.changePage()` to do Client Routing, see `_default.page.client.js`
  objectAssign(app, {
    changePage: (pageContext: PageContext) => {
      Object.assign(pageContextReactive, pageContext)
      rootComponent.Page = markRaw(pageContext.Page)
      rootComponent.pageProps = markRaw(pageContext.pageProps || {})
    },
  })

  // When doing Client Routing, we mutate pageContext (see usage of `app.changePage()` in `_default.page.client.js`).
  // We therefore use a reactive pageContext.
  const pageContextReactive = reactive(pageContext)

  // Make `pageContext` accessible from any Vue component
  setPageContext(app, pageContextReactive)

  return app
}

// Same as `Object.assign()` but with type inference
function objectAssign<Obj, ObjAddendum>(obj: Obj, objAddendum: ObjAddendum): asserts obj is Obj & ObjAddendum {
  Object.assign(obj, objAddendum)
}
