import { defineComponent, h, Plugin, App, VNode } from 'vue'

import { RouteRecord } from 'vue-router';

type Dictionary<T> = { [key: string]: T }
type CallbackFunction = (params: Dictionary<string>) => string;

type Breadcrumbs = {
  label: string
  parent: string
}

const VueBreadcrumbs: Plugin = {
  install(Vue: App, options: Dictionary<any> = {}) {

    if (options.template) {
      options.render = undefined;
    }


    Object.defineProperties(Vue.config.globalProperties, {
      $breadcrumbs: {
        get(): RouteRecord[] {
          function findParents(this: App, routeName: string, matches: RouteRecord[] = []): RouteRecord[] {
            const routeParents: RouteRecord[] = this.config.globalProperties.$router.resolve({ name: routeName }).route.matched;
            const routeParentLast: RouteRecord | undefined = routeParents.pop();

            if (routeParentLast) {
              matches.unshift(routeParentLast);

              let breadcrumb = routeParentLast.meta?.breadcrumb;

              if (typeof breadcrumb === 'function') {
                breadcrumb = breadcrumb.call(
                  this,
                  this.config.globalProperties.$route.params
                );
              }

              if (
                typeof breadcrumb === "object" &&
                !!breadcrumb &&
                "parent" in breadcrumb &&
                !!(breadcrumb as { parent: string }).parent &&
                typeof (breadcrumb as { parent: string }).parent === "string"
              ) {
                return findParents.call(
                  this,
                  (breadcrumb as { parent: string }).parent,
                  matches
                );
              }
            }
            return routeParents.concat(matches);
          }

          return this.$route.matched
            .flatMap((route: RouteRecord) => {
              let routeRecord: RouteRecord[] = [route];
              let breadcrumb = route.meta?.breadcrumb;

              if (typeof breadcrumb === 'function') {
                breadcrumb = breadcrumb.call(this, this.$route.params);
              }

              if (
                typeof breadcrumb === "object" &&
                !!breadcrumb &&
                "parent" in breadcrumb &&
                !!(breadcrumb as { parent: string }).parent &&
                typeof (breadcrumb as { parent: string }).parent === "string"
              ) {
                const matched = findParents.call(
                  this,
                  (breadcrumb as { parent: string }).parent,
                  []
                );
                routeRecord = matched.slice().concat(routeRecord.slice());
              }

              return routeRecord
            })
            .map((route: RouteRecord) => route.path.length === 0
              ? ({ ...route, path: '/' })
              : route
            );
        }
      }
    });

    Vue.component('Breadcrumbs', defineComponent({
      methods: {
        getBreadcrumb(bc: string | CallbackFunction | Breadcrumbs): string {
          let name = bc;

          if (typeof name === 'function') {
            name = name.call(this, this.$route.params);
          }

          if (typeof name === 'object') {
            name = name.label
          }

          return name;
        },
        getPath(crumb: RouteRecord): string {
          let { path } = crumb;

          for (const [key, value] of Object.entries(
            this.$route.params
          )) {
            path = path.replace(`:${key}`, value as string);
          }

          return path;
        }
      },
      render(): VNode {
        if (this.$breadcrumbs.length) {
          return h(
            'ol',
            {
              class: {
                'breadcrumb': true
              }
            },
            this.$breadcrumbs.map((crumb: RouteRecord, index: number) => {
              if (crumb?.meta?.breadcrumb) {
                const label = this.getBreadcrumb(crumb.meta.breadcrumb);
                if (label?.length > 0) {
                  return h(
                    'li',
                    {
                      class: {
                        'breadcrumb-item': true
                      },
                      props: {
                        key: index
                      }
                    },
                    [
                      h(
                        'router-link',
                        {
                          props: {
                            to: { path: this.getPath(crumb) },
                            tag: index !== this.$breadcrumbs.length - 1 ? 'a' : 'span'
                          }
                        },
                        ` ${label}`
                      )
                    ]
                  )
                }
              }

              return h('span');
            })
          )
        }

        return h('span');
      },
      ...options
    }))
  }
}

export default VueBreadcrumbs;

declare global {
  interface Window {
    Vue: App | undefined;
  }
}

// Automatic installation if Vue has been added to the global scope.
if (typeof window !== 'undefined' && window.Vue) {
  window.Vue.use(VueBreadcrumbs)
}
