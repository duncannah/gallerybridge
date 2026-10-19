# GalleryBridge

Expose local stash through common book library server routes.

TODO

## Configuration

- `SEARCH_PATH`: Path to the directory
- `THUMBNAIL_BLUR_BACKGROUND`: Fit the cover into a 2:3 portrait frame, commonly used by clients (default: `true`)

### Expected directory structure

- Artist/Publisher
  - Book/Post/Entry
    - Loose JPG, JPEG, and PNG files

## Simulated servers

### Komga

Smallest possible implementation of the [Komga](https://github.com/gotson/komga) API, enough to keep [Aidoku](https://github.com/Aidoku/Aidoku) happy for basic reading.

Any credentials are accepted.
