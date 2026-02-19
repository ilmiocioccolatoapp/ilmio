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
    if (idx != -1) {
      final before = url.substring(0, idx + 8); // includes '/upload/'
      final after = url.substring(idx + 8);
      return '$beforew_${width},q_auto,f_auto/$after';
    }
    return url;
  }
  return url;
}
