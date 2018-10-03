<!-- -- first draft -- -->

In summary the trick to the animation is:There's a `<Masker>` that is a simple blue empty box responsible for the major part of the animation:
When opening the Income Details modal, this is what happens:
  - the `Trigger` (a contribution or the warning message), starts to fade out.
  - the `Target`  (Income Details modal), is added to the DOM _invisible_.
  - the `<Masker>` fadesIn at the exactly same position as `Trigger` and animates to the `Target` position.
After that animation finishes, the `<Masker>` fadeouts and the `Target` fades in.
When closing the Income Details modal the same happens on the opposite direction slightly faster.

- More info to be added tomorrow.
