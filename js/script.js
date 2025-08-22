var prevScrollpos = window.pageYOffset;
window.onscroll = function () {
  var currentScrollPos = window.pageYOffset;
  if (prevScrollpos > currentScrollPos) {
    document.getElementById("scrollTop").style.bottom = "-6rem";
  } else {
    if (currentScrollPos > 50) {
      /* Menampilkan tombol ketika halaman di-scroll ke bawah lebih dari 200px */
      document.getElementById("scrollTop").style.bottom = "2rem";
    }
  }
  prevScrollpos = currentScrollPos;
};

//scroll ke atas
function scrollToTop() {
  window.scrollTo(0, 0);
  document.getElementById("scrollTop").style.bottom = "-6rem";
}
