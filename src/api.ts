import AggregatesPluggin from "@graphile/pg-aggregates";
// import SimplifyInflectorPlugin from "@graphile-contrib/pg-simplify-inflector";
import express from "express";
import { NodePlugin } from "graphile-build";
import type * as pg from "pg";
import {
  //   gql,
  //   makeExtendSchemaPlugin,
  postgraphile,
  //   Plugin,
} from "postgraphile";
// const { makeExtendSchemaPlugin, gql } = require("graphile-utils");
import { makeExtendSchemaPlugin, gql } from "graphile-utils";
import { Plugin } from "graphile-build";
import { GraphQLObjectType } from "graphql";
// import FilterPlugin from "postgraphile-plugin-connection-filter";

const app = express();

const { GraphQLInt } = require("graphql");

// const PaginationPlugin = {
//   ["GraphQLObjectType:fields:field"]: (field, { extend }, context) => {
//     const {
//       scope: { isPgFieldConnection },
//       addArgDataGenerator,
//     } = context;

//     if (!isPgFieldConnection) {
//       return field;
//     }

//     addArgDataGenerator(({ first, skip }) => {
//       return {
//         pgQuery: (queryBuilder) => {
//           if (first != null) {
//             queryBuilder.limit(first);
//           }
//           if (skip != null) {
//             queryBuilder.offset(skip);
//           }
//         },
//       };
//     });

//     return extend(field, {
//       args: {
//         first: {
//           type: GraphQLInt,
//         },
//         skip: {
//           type: GraphQLInt,
//         },
//       },
//     });
//   },
// };

// export const customPaginationPlugin: Plugin = makeExtendSchemaPlugin(
//   (build, options) => {
//     console.log("options: ", options);
//     console.log("build: ", build);
//     const { pgSql: sql, inflection, graphql } = build;
//     const schemas: string[] = options.stateSchemas || ["squid_processor"];

//     // this plugin maps the already existing pagination args (offset and limit) to the new ones (first and skip)

//     // return build.newWithHooks(GraphQLObjectType, {
//     //   name: "MyObject",
//     //   fields: ({ fieldWithHooks }) => {
//     //     return {
//     //       connection: fieldWithHooks(
//     //         "connection",
//     //         ({ addArgDataGenerator }) => {
//     //           addArgDataGenerator(function connectionFirst({ first }) {
//     //             if (first) {
//     //               return { limit: [first] };
//     //             }
//     //           });
//     //           return {
//     //             type: ConnectionType,
//     //             args: {
//     //               first: {
//     //                 type: GraphQLInt,
//     //               },
//     //             },
//     //           };
//     //         }
//     //       ),
//     //     };
//     //   },
//     // });
//   }

//   // return {

//   // }

//   //     return extend(
//   //       field,
//   //       {
//   //         args: {
//   //           limit: {
//   //             type: GraphQLInt,
//   //           },
//   //           offset: {
//   //             type: GraphQLInt,
//   //           },
//   //         },
//   //       },
//   //       `Adding limit and offset args`
//   //     );
//   //   }
// );

// const GlobalPaginationPlugin = makeExtendSchemaPlugin((build) => {
//   const {
//     graphql: { GraphQLInt },
//     inflection,
//     pgSql: sql,
//   } = build;

//   function addPaginationArguments(field) {
//     field.args.first = {
//       type: GraphQLInt,
//     };
//     field.args.skip = {
//       type: GraphQLInt,
//     };

//     const { resolve } = field;
//     field.resolve = (query, args, context, resolveInfo) => {
//       const { first, skip } = args;

//       if (first != null) {
//         resolveInfo.graphile.build.pgQuery(query, (queryBuilder) => {
//           queryBuilder.limit(first);
//         });
//       }

//       if (skip != null) {
//         resolveInfo.graphile.build.pgQuery(query, (queryBuilder) => {
//           queryBuilder.offset(skip);
//         });
//       }

//       return resolve(query, args, context, resolveInfo);
//     };

//     return field;
//   }

//   return {
//     typeDefs: gql`
//         extend type Query {
//           # No need to extend specific queries since we are globally modifying fields
//         }
//       `,
//     resolvers: {},
//     visitor: {
//       FieldDefinition: (field, { addDataGenerator }) => {
//         const fieldType = field.getType();
//         if (
//           fieldType.name.startsWith(inflection.connection()) &&
//           fieldType.ofType &&
//           fieldType.ofType.getFields
//         ) {
//           // Ensure this only applies to connection fields
//           addDataGenerator(() => ({
//             pgQuery: (queryBuilder) => {
//               queryBuilder.beforeLock("orderBy", () => {
//                 // We're locking ordering to prevent last-resort order by primary key
//                 if (!queryBuilder.isOrderUnique(false)) {
//                   queryBuilder.orderBy(sql.fragment`TRUE`);
//                 }
//               });
//             },
//           }));

//           const fields = fieldType.ofType.getFields();
//           Object.values(fields).forEach((subField) => {
//             if (
//               subField.name === "nodes" ||
//               subField.name.endsWith("Connection")
//             ) {
//               wrapField(subField, addPaginationArguments);
//             }
//           });
//         }
//       },
//     },
//   };
// });

app.use(
  postgraphile(
    {
      host: process.env.DB_HOST || "localhost",
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
      database: process.env.DB_NAME || "postgres",
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASS || "postgres",
    },
    "public",
    {
      graphiql: true,
      enhanceGraphiql: true,
      dynamicJson: true,
      disableDefaultMutations: true,
      skipPlugins: [NodePlugin],
      appendPlugins: [
        AggregatesPluggin,
        // FilterPlugin,
        // SimplifyInflectorPlugin,
        // PaginationPlugin,
        // GlobalPaginationPlugin
        // customPaginationPlugin,
      ],
      externalUrlBase: process.env.BASE_PATH,
    }
  )
);

app.listen(process.env.GQL_PORT, () => {
  console.log(`Squid API listening on port ${process.env.GQL_PORT}`);
});
