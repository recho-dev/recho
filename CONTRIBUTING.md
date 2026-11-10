# Recho - Contributing

Recho is open source and released under the [ISC license](/LICENCE). You are welcome to contribute in different ways: open a [pull request](https://github.com/recho-dev/notebook/pulls), participate in [issues](https://github.com/recho-dev/notebook/issues) and [discussions](https://github.com/recho-dev/notebook/discussions) or star this project!

## Sharing Examples

All the examples are located in `app/examples`. The quickest way to add an example is through GitHub's web editor:

- Go to [new file](https://github.com/recho-dev/notebook/new/main/app/examples).
- Enter the filename in the format of `[NOTEBOOK-NAME].recho.js`.
- Add the metadata as doc strings at the top of the file.
- Add the code below the metadata.
- Click the "Commit changes" button.

The following metadata is required:

- **title** - the title of the notebook
- **author** - the author of the notebook
- **created** - the date of the creation of the notebook
- **github** - the GitHub username of the author, for displaying the avatar
- **pull_request** - the pull request number of adding this notebook, for commenting on the pull request

The following metadata is optional:

- **thumbnail_start** - the line number of the start of the thumbnail code
- **thumbnail_start_x** - the column of the start of the thumbnail code, counted on the source line

Here is an example:

```js
/**
 * @title Hello World
 * @author Bairui SU
 * @github pearmini
 * @created 2025-09-15
 * @pull_request 123
 * @thumbnail_start 26
 */

echo("Hello World");
```

This is a [pull request](https://github.com/recho-dev/notebook/pull/82) you can refer to.

## Editor & Runtime Development

If you want to contribute to the editor or runtime, make sure to add test files in `test/js/` and register them in `test/js/index.js`.

For example, if you add a new test file called `hello-world.js` with the following content:

```js
export const helloWorld = `echo("Hello World");`;
```

Then you need to register it in `test/js/index.js` with the following content:

```js
// test/js/index.js
export {helloWorld} from "./hello-world.js";
```

Then run `npm run dev` to open the development server.

![test-env](/img/test-env.png)

After finishing development, if you want to add this test case to snapshot tests, then register it in `test/js/index-tests.js`:

```js
// test/js/index.js
export {helloWorld} from "./hello-world.js";
```

After that, run `npm run test` to generate the snapshot file for this test case, which is located at `test/output/helloWorld.js`.

## Website Development

If you want to contribute to the [website](https://recho.dev/notebook), run `npm run app:dev` to open the development server. After finishing development, run `npm run test` to make sure everything works as expected.

On the website, notebooks run in an iframe from another site, the runtime page in [runtime/frame/](/runtime/frame/), so that their code can't reach the user's sign-in and an infinite loop freezes only the frame. `npm run app:dev` also starts the runtime page at http://127.0.0.1:5174. In development notebooks run in the page itself, unless you set `NEXT_PUBLIC_RUNTIME_ORIGIN=http://127.0.0.1:5174` in `.env.local` (a different host than `localhost`, so the browser treats it as another site). In production the runtime page is its own Vercel project: build command `npm run runtime:build`, output directory `runtime/frame/dist`.
