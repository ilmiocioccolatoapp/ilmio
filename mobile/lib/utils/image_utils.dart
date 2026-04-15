import 'package:flutter/widgets.dart';
import 'constants.dart';

String getSizedImageUrl(String url, BuildContext context) {
  final target = _calculateTargetWidth(context);
  return _buildCloudinaryUrl(url, target);
}

int _calculateTargetWidth(BuildContext context) {
  final mq = MediaQuery.of(context);
  final physicalWidth = (mq.size.width * mq.devicePixelRatio).round();

  if (physicalWidth >= AppConstants.imageLandscapeHeroWidth) {
    return AppConstants.imageLandscapeHeroWidth;
  }
  if (physicalWidth >= AppConstants.imageLandscapeCardWidth) {
    return AppConstants.imageLandscapeCardWidth;
  }
  return AppConstants.imageLandscapeThumbWidth;
}

String _buildCloudinaryUrl(String url, int width) {
  final lower = url.toLowerCase();
  if (lower.contains('res.cloudinary.com') ||
      lower.contains('cloudinary.com')) {
    final idx = url.indexOf('/upload/');
    if (idx == -1) return url;

    final before = url.substring(0, idx + 8); // includes '/upload/'
    String after = url.substring(idx + 8);

    // If there are existing transformations (they appear before the version
    // segment or before the public id), remove them so we can insert a
    // normalized transformation string. Transformations are typically
    // comma-separated tokens (e.g. "c_fill,w_800") and followed by '/'.
    // If `after` starts with a transformation token (contains '_' or ','),
    // strip until the next '/'.
    if (after.isNotEmpty) {
      final slashPos = after.indexOf('/');
      if (slashPos > 0) {
        final firstSegment = after.substring(0, slashPos);
        // Heuristic: treat as transformation if it contains '_' or ',' or starts with 'c' or 'w'
        if (firstSegment.contains(',') ||
            firstSegment.contains('_') ||
            RegExp(r'^(c|w|h|q|f|g|b)[_,]').hasMatch(firstSegment)) {
          after = after.substring(slashPos + 1);
        }
      }
    }

    // Insert our transformation (width + auto quality/format) before the
    // remaining path (which usually starts with version 'v123' or the
    // folder/public id).
    return before + 'w_${width},q_auto,f_auto/' + after;
  }
  return url;
}
